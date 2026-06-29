// Edge function: periodically sync bracket results from the tennis API.
//
// Invoked on a schedule (see the pg_cron migration). For each eligible bracket
// it fetches the tournament's results once, fills in winners for newly-decided
// matches (winner only, never the score), and writes them back. It is
// idempotent and a no-op when nothing is eligible.
//
// Eligibility: tournament_id set, pickable = false (the bracket is locked),
// end_date not in the past (1-day grace), results not already complete, and —
// if a timezone is set — the tournament's local time is within active hours.
//
// Required secrets: RAPIDAPI_KEY. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// injected automatically by the platform.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
	computeResults,
	isActiveHour,
	isComplete,
	type ApiMatch,
	type Result,
	type Seed
} from '../_shared/results.ts';

const RAPIDAPI_HOST = 'tennis-api-atp-wta-itf.p.rapidapi.com';

// Thrown when the API returns 429 after exhausting in-call retries. Carries the
// status so the caller can stop the run rather than burning a request per
// bracket against an already-depleted quota.
class RateLimitError extends Error {
	constructor(public body: string) {
		super(`API 429 (rate limited): ${body}`);
		this.name = 'RateLimitError';
	}
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Parse a Retry-After header (delta-seconds or HTTP-date) into milliseconds.
function parseRetryAfterMs(res: Response): number | null {
	const raw = res.headers.get('retry-after');
	if (!raw) return null;
	const secs = Number(raw);
	if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
	const when = Date.parse(raw);
	return Number.isFinite(when) ? Math.max(0, when - Date.now()) : null;
}

type Bracket = {
	id: string;
	draw_size: number;
	seeds: Seed[];
	results: Result[];
	tournament_id: number | null;
	tour: 'atp' | 'wta' | null;
	end_date: string | null;
	timezone: string | null;
};

// Max in-call retries on a 429. Short transient rate-limits (per-second/minute)
// recover within a couple of backoffs; a depleted daily quota will not, so we
// only retry when Retry-After is absent or short and otherwise fail fast.
const MAX_RETRIES = 2;
const MAX_BACKOFF_MS = 5000;

async function fetchSingles(
	tour: string,
	tournamentId: number,
	apiKey: string
): Promise<ApiMatch[]> {
	const url = `https://${RAPIDAPI_HOST}/tennis/v2/${tour}/tournament/results/${tournamentId}`;
	for (let attempt = 0; ; attempt++) {
		const res = await fetch(url, {
			headers: {
				'Content-Type': 'application/json',
				'x-rapidapi-host': RAPIDAPI_HOST,
				'x-rapidapi-key': apiKey
			}
		});

		if (res.status === 429) {
			const body = await res.text().catch(() => '');
			const retryAfterMs = parseRetryAfterMs(res);
			// A long Retry-After means a daily-quota reset, not a transient blip —
			// don't sleep it out within the request; bail so the run stops.
			const transient =
				attempt < MAX_RETRIES && (retryAfterMs == null || retryAfterMs <= MAX_BACKOFF_MS);
			if (!transient) throw new RateLimitError(body);
			const backoff = Math.min(retryAfterMs ?? 500 * 2 ** attempt, MAX_BACKOFF_MS);
			await sleep(backoff);
			continue;
		}

		if (!res.ok) {
			throw new Error(
				`API ${res.status} for ${tour}/${tournamentId}: ${await res.text().catch(() => '')}`
			);
		}
		const json = await res.json();
		return (json?.data?.singles ?? []) as ApiMatch[];
	}
}

Deno.serve(async () => {
	const apiKey = Deno.env.get('RAPIDAPI_KEY');
	const supabaseUrl = Deno.env.get('SUPABASE_URL');
	const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

	if (!apiKey || !supabaseUrl || !serviceKey) {
		return Response.json(
			{ ok: false, error: 'Missing RAPIDAPI_KEY / Supabase env' },
			{ status: 500 }
		);
	}

	const supabase = createClient(supabaseUrl, serviceKey);
	const now = new Date();
	const graceMs = 24 * 60 * 60 * 1000; // allow a day past end_date for late matches

	// Candidate brackets — coarse filter in SQL, finer checks below.
	const { data, error } = await supabase
		.from('brackets')
		.select('id, draw_size, seeds, results, tournament_id, tour, end_date, timezone')
		.not('tournament_id', 'is', null)
		.eq('pickable', false);

	if (error) {
		return Response.json({ ok: false, error: error.message }, { status: 500 });
	}

	const report: Array<Record<string, unknown>> = [];
	let rateLimited = false;

	for (const b of (data ?? []) as Bracket[]) {
		if (b.tour !== 'atp' && b.tour !== 'wta') {
			report.push({ id: b.id, skipped: 'invalid-tour' });
			continue;
		}
		if (b.end_date && new Date(b.end_date).getTime() + graceMs < now.getTime()) {
			report.push({ id: b.id, skipped: 'past-end-date' });
			continue;
		}
		if (isComplete(b.draw_size, b.results ?? [])) {
			report.push({ id: b.id, skipped: 'already-complete' });
			continue;
		}
		if (!isActiveHour(b.timezone, now)) {
			report.push({ id: b.id, skipped: 'inactive-hours' });
			continue;
		}

		try {
			const singles = await fetchSingles(b.tour, b.tournament_id as number, apiKey);
			const outcome = computeResults(b.draw_size, b.seeds ?? [], b.results ?? [], singles);

			if (!outcome.changed) {
				await supabase
					.from('brackets')
					.update({ results_synced_at: now.toISOString() })
					.eq('id', b.id);
				report.push({ id: b.id, filled: 0 });
				continue;
			}

			const { error: upErr } = await supabase
				.from('brackets')
				.update({ results: outcome.results, results_synced_at: now.toISOString() })
				.eq('id', b.id);

			if (upErr) {
				report.push({ id: b.id, error: upErr.message });
			} else {
				report.push({ id: b.id, filled: outcome.filled });
			}
		} catch (e) {
			if (e instanceof RateLimitError) {
				// Quota is depleted — every remaining bracket would 429 too. Stop the
				// run rather than spending one more request apiece.
				report.push({ id: b.id, error: 'rate-limited', status: 429 });
				rateLimited = true;
				break;
			}
			report.push({ id: b.id, error: String(e instanceof Error ? e.message : e) });
		}
	}

	return Response.json({ ok: true, rateLimited, processed: report.length, report });
});
