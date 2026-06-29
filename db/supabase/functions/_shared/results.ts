// Pure logic for syncing bracket results from the tennis API. Kept free of any
// Deno/Supabase imports so it can be unit-tested with plain Node (tsx/vitest).
//
// The data model mirrors the app (see src/lib/bracket-utils.ts and the
// saveResults() merge in src/routes/bracket/[bracket]/+page.svelte):
//   - `seeds` is an array of length `draw_size` in draw order; seeds[2m] plays
//     seeds[2m+1] in round-0 match m. Entries are { name, seed, country } | null
//     (null = an empty draw slot / bye).
//   - `results[match_index]` is { player_a, player_b, winner, score } where
//     player_a/player_b/winner are indices into `seeds` (or null).

export type Seed = { name: string; seed?: number | string | null; country?: string | null } | null;

export type Result = {
	player_a: number | null;
	player_b: number | null;
	winner: number | null;
	score: unknown;
} | null;

export type ApiPlayer = { id: number; name: string; countryAcr?: string | null };

export type ApiMatch = {
	match_winner: number | null;
	player1: ApiPlayer;
	player2: ApiPlayer;
};

// ---- bracket geometry (ported from src/lib/bracket-utils.ts) ----------------

type Round = { index: number; name: string; matches: number; first_match: number; value: number };
type Match = { round: number; match_index: number };

function getMatchCountByRound(draw_size: number): number[] {
	const r = Math.log2(draw_size);
	return Array.from({ length: r }, (_, index) => draw_size / 2 ** (index + 1));
}

function getMatchCountIndices(match_count_by_round: number[]): number[] {
	const mci = [0];
	match_count_by_round.slice(0, -1).forEach((count) => {
		mci.push(mci[mci.length - 1] + count);
	});
	return mci;
}

function getRounds(draw_size: number): Round[] {
	const r = Math.log2(draw_size);
	let fm = 0;
	return Array.from({ length: r }, (_, index) => {
		const competitors = 2 ** (r - index);
		const matches = competitors / 2;
		const first_match = fm;
		fm += matches;
		return { name: `R${competitors}`, index, matches, value: draw_size / competitors, first_match };
	});
}

function getMatches(draw_size: number, rounds: Round[]): Match[] {
	return rounds.reduce(
		(acc, round) => {
			const r = Array.from({ length: acc.remaining }, (_, i) => ({
				round: round.index,
				match_index: acc.total + i
			}));
			acc.matches.push(...r);
			acc.remaining /= 2;
			acc.total += r.length;
			return acc;
		},
		{ matches: [] as Match[], remaining: draw_size / 2, total: 0 }
	).matches;
}

function getParentMatch(
	match_index: number,
	player: 'player_a' | 'player_b',
	matches: Match[],
	round_match_indices: number[]
): number | null {
	const match = matches[match_index];
	if (match.round <= 0) return null;
	const index_in_round = match_index - round_match_indices[match.round];
	const pm = round_match_indices[match.round - 1] + index_in_round * 2;
	return player === 'player_a' ? pm : pm + 1;
}

// ---- name matching ----------------------------------------------------------

// Normalize a player name for comparison: strip diacritics, drop punctuation,
// lowercase, collapse whitespace.
function normalizeName(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '') // combining accents
		.replace(/[.'`]/g, '') // periods/apostrophes (e.g. "N." / "O'Connell")
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}

// Last name = the final whitespace token of the normalized name. We match on
// last name because first names are often abbreviated ("N. Djokovic") and so
// are unreliable. Hyphenated surnames stay a single token.
export function lastName(name: string): string {
	const parts = normalizeName(name).split(' ');
	return parts[parts.length - 1] || '';
}

function firstInitial(name: string): string {
	const parts = normalizeName(name).split(' ');
	return parts.length > 1 ? parts[0][0] || '' : '';
}

// Given a bracket match between two seeds, find which seed (if any) the API
// reports as the winner. Returns 'a', 'b', or null (no decided match / can't
// confidently match). Matches purely on last name, with a first-initial
// tiebreak only when the two seeds share a last name.
export function lookupWinner(api: ApiMatch[], seedA: Seed, seedB: Seed): 'a' | 'b' | null {
	if (!seedA || !seedB) return null;
	const aLast = lastName(seedA.name);
	const bLast = lastName(seedB.name);

	const wantPair = [aLast, bLast].sort();
	const candidates = api.filter((m) => {
		if (m.match_winner == null) return false;
		const pair = [lastName(m.player1.name), lastName(m.player2.name)].sort();
		return pair[0] === wantPair[0] && pair[1] === wantPair[1];
	});

	// Zero matches → not played yet (or unmatched names). More than one →
	// ambiguous; refuse to guess.
	if (candidates.length !== 1) return null;

	const m = candidates[0];
	const winner = m.match_winner === m.player1.id ? m.player1 : m.player2;
	const wLast = lastName(winner.name);

	if (aLast !== bLast) {
		if (wLast === aLast) return 'a';
		if (wLast === bLast) return 'b';
		return null;
	}

	// Same last name on both sides: disambiguate by first initial if possible.
	const aInit = firstInitial(seedA.name);
	const bInit = firstInitial(seedB.name);
	if (aInit && bInit && aInit !== bInit) {
		const wInit = firstInitial(winner.name);
		if (wInit === aInit) return 'a';
		if (wInit === bInit) return 'b';
	}
	return null;
}

// ---- result computation -----------------------------------------------------

export type ComputeOutcome = {
	results: Result[];
	changed: boolean;
	filled: number; // count of newly-decided winners this pass
};

// Walk the bracket and fill in winners for any not-yet-decided match, using the
// API results. Mirrors the app's saveResults(): never overwrites an existing
// winner, re-derives player_a/player_b from parent winners, and clears any
// winner that is no longer one of its match's players.
export function computeResults(
	draw_size: number,
	seeds: Seed[],
	original: Result[],
	apiSingles: ApiMatch[]
): ComputeOutcome {
	const rounds = getRounds(draw_size);
	const allMatches = getMatches(draw_size, rounds);
	const roundMatchIndices = getMatchCountIndices(getMatchCountByRound(draw_size));

	// Work on a copy. Ensure round-0 entries exist with their fixed seed slots.
	const merged: Result[] = Array.from({ length: allMatches.length }, (_, i) =>
		original[i] ? ({ ...(original[i] as object) } as Result) : null
	);
	const firstRoundMatches = draw_size / 2;
	for (let i = 0; i < firstRoundMatches; i++) {
		if (!merged[i]) merged[i] = { player_a: i * 2, player_b: i * 2 + 1, winner: null, score: null };
	}

	let filled = 0;

	// Forward pass. getMatches() is ordered round-by-round, so a match's parents
	// (previous round, lower indices) are always processed first.
	for (let i = 0; i < allMatches.length; i++) {
		const match = allMatches[i];

		// Derive players from parent winners for rounds after the first.
		if (match.round > 0) {
			for (const player of ['player_a', 'player_b'] as const) {
				const parentIdx = getParentMatch(i, player, allMatches, roundMatchIndices);
				if (parentIdx == null) continue;
				const winner = merged[parentIdx]?.winner ?? null;
				if (merged[i]) {
					(merged[i] as Result & object)[player] = winner;
				} else if (winner !== null) {
					merged[i] = {
						player_a: null,
						player_b: null,
						winner: null,
						score: null,
						[player]: winner
					};
				}
			}
		}

		const entry = merged[i];
		if (!entry || entry.winner != null) continue; // never overwrite a set winner

		const a = entry.player_a;
		const b = entry.player_b;

		if (match.round === 0) {
			// Byes: a lone player in a null-vs-player slot auto-advances.
			const aSeed = a != null ? seeds[a] : null;
			const bSeed = b != null ? seeds[b] : null;
			if (aSeed && !bSeed) {
				entry.winner = a;
				filled++;
				continue;
			}
			if (bSeed && !aSeed) {
				entry.winner = b;
				filled++;
				continue;
			}
			if (!aSeed || !bSeed) continue; // empty match, nothing to decide
			const w = lookupWinner(apiSingles, aSeed, bSeed);
			if (w === 'a') entry.winner = a;
			else if (w === 'b') entry.winner = b;
			if (entry.winner != null) filled++;
		} else {
			// Later rounds: both players must be known to look the match up.
			if (a == null || b == null) continue;
			const w = lookupWinner(apiSingles, seeds[a], seeds[b]);
			if (w === 'a') entry.winner = a;
			else if (w === 'b') entry.winner = b;
			if (entry.winner != null) filled++;
		}
	}

	// Safety: clear any winner that's no longer one of the match's players.
	for (let i = 0; i < merged.length; i++) {
		const m = merged[i];
		if (m && m.winner != null && m.winner !== m.player_a && m.winner !== m.player_b) {
			m.winner = null;
		}
	}

	const changed = merged.some((m, i) => (m?.winner ?? null) !== (original[i]?.winner ?? null));
	return { results: merged, changed, filled };
}

// True if the bracket already has a winner for every match.
export function isComplete(draw_size: number, results: Result[]): boolean {
	const total = draw_size - 1;
	let decided = 0;
	for (const r of results) if (r?.winner != null) decided++;
	return decided >= total;
}

// 11:00–03:00 in the given IANA timezone is "active". Invalid/empty tz → always
// active (don't block the sync on a misconfiguration).
export function isActiveHour(timezone: string | null | undefined, now: Date): boolean {
	if (!timezone) return true;
	try {
		const fmt = new Intl.DateTimeFormat('en-GB', {
			timeZone: timezone,
			hour: 'numeric',
			hour12: false
		});
		let h = parseInt(fmt.format(now), 10);
		if (h === 24) h = 0;
		return h >= 11 || h < 3;
	} catch {
		return true;
	}
}
