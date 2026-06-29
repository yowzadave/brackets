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

async function fetchSingles(
	tour: string,
	tournamentId: number,
	apiKey: string
): Promise<ApiMatch[]> {
	const url = `https://${RAPIDAPI_HOST}/tennis/v2/${tour}/tournament/results/${tournamentId}`;
	const res = await fetch(url, {
		headers: {
			'Content-Type': 'application/json',
			'x-rapidapi-host': RAPIDAPI_HOST,
			'x-rapidapi-key': apiKey
		}
	});
	if (!res.ok) {
		throw new Error(
			`API ${res.status} for ${tour}/${tournamentId}: ${await res.text().catch(() => '')}`
		);
	}
	const json = await res.json();
	return (json?.data?.singles ?? []) as ApiMatch[];
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
			report.push({ id: b.id, error: String(e instanceof Error ? e.message : e) });
		}
	}

	return Response.json({ ok: true, processed: report.length, report });
});
