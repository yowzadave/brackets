// Verification harness for the results-sync logic. Reconstructs the real
// Brisbane 2026 draw order from the cached API results, then runs it through
// computeResults() to confirm the bracket-walking + last-name matching
// reproduces every winner up to the champion.
//
// Run: npx tsx scripts/verify-results-sync.ts

import { readFileSync } from 'node:fs';
import {
	computeResults,
	isActiveHour,
	lastName,
	lookupWinner,
	type ApiMatch,
	type Result,
	type Seed
} from '../db/supabase/functions/_shared/results.ts';

type RawMatch = {
	roundId: number;
	player1Id: number;
	player2Id: number;
	match_winner: number;
	player1: { id: number; name: string; countryAcr: string };
	player2: { id: number; name: string; countryAcr: string };
};

const raw = JSON.parse(readFileSync('scripts/.cache/sample-results-21301.json', 'utf8'));
const singles: RawMatch[] = (raw.data.singles as RawMatch[]).filter((m) => m.match_winner != null);

// Group matches by roundId, mapped to a 0-based round index (ascending roundId).
const roundIds = [...new Set(singles.map((m) => m.roundId))].sort((a, b) => a - b);
const byRound: RawMatch[][] = roundIds.map((rid) => singles.filter((m) => m.roundId === rid));
const topIdx = roundIds.length - 1;

const involves = (m: RawMatch, id: number) => m.player1Id === id || m.player2Id === id;
const playerOf = (id: number) => {
	for (const m of singles) {
		if (m.player1Id === id) return m.player1;
		if (m.player2Id === id) return m.player2;
	}
	throw new Error(`unknown player ${id}`);
};

// Ordered leaves (round-0 participants) of the subtree whose root match (at
// `roundIdx`) was won by `winnerId`.
function leaves(winnerId: number, roundIdx: number): { name: string }[] {
	const m = byRound[roundIdx].find((x) => x.match_winner === winnerId && involves(x, winnerId));
	if (!m) return [playerOf(winnerId)]; // bye/missing
	if (roundIdx === 0) return [m.player1, m.player2];
	return [...leaves(m.player1Id, roundIdx - 1), ...leaves(m.player2Id, roundIdx - 1)];
}

const final = byRound[topIdx][0];
const drawOrder = [...leaves(final.player1Id, topIdx - 1), ...leaves(final.player2Id, topIdx - 1)];

const draw_size = drawOrder.length;
const seeds: Seed[] = drawOrder.map((p) => ({ name: p.name, seed: null }));
const original: Result[] = Array(draw_size - 1).fill(null);
const apiSingles = singles as unknown as ApiMatch[];

// ---- run ----
const outcome = computeResults(draw_size, seeds, original, apiSingles);

const champion = outcome.results[outcome.results.length - 1]?.winner;
const championName = champion != null ? seeds[champion]!.name : '(none)';
const decided = outcome.results.filter((r) => r?.winner != null).length;
const apiChampionName = playerOf(final.match_winner).name;

let pass = true;
const check = (label: string, cond: boolean) => {
	if (!cond) pass = false;
	console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
};

console.log(`Reconstructed a ${draw_size}-draw with ${apiSingles.length} API matches.`);
check(`all ${draw_size - 1} matches decided`, decided === draw_size - 1);
check(`filled count === ${draw_size - 1}`, outcome.filled === draw_size - 1);
check(`changed flag set`, outcome.changed === true);
check(`champion matches API (${apiChampionName})`, championName === apiChampionName);

// ---- targeted unit checks for the matcher ----
console.log('\n-- matcher unit checks --');
check('accent-insensitive last name', lastName('Stéphane Robèrt') === lastName('Stephane Robert'));
check('abbreviated first name ignored', lastName('N. Djokovic') === lastName('Novak Djokovic'));

const synthApi: ApiMatch[] = [
	{
		match_winner: 2,
		player1: { id: 1, name: 'Carlos Alcaraz' },
		player2: { id: 2, name: 'Jannik Sinner' }
	}
];
check(
	'abbreviated first names still match the pair',
	lookupWinner(synthApi, { name: 'C. Alcaraz' }, { name: 'J. Sinner' }) === 'b'
);
check(
	'unknown pairing returns null (not played)',
	lookupWinner(synthApi, { name: 'Roger Federer' }, { name: 'Rafael Nadal' }) === null
);

// bye: lone player in a null slot auto-advances
const byeSeeds: Seed[] = [{ name: 'Solo Player' }, null];
const byeOut = computeResults(2, byeSeeds, [null], []);
check('bye auto-advances lone player', byeOut.results[0]?.winner === 0);

// active-hours window
check('11:00 local is active', isActiveHour('UTC', new Date('2026-06-29T11:30:00Z')));
check(
	'00:30 local is active (hour after midnight)',
	isActiveHour('UTC', new Date('2026-06-29T00:30:00Z'))
);
check('01:00 local is inactive', !isActiveHour('UTC', new Date('2026-06-29T01:00:00Z')));
check('07:00 local is inactive', !isActiveHour('UTC', new Date('2026-06-29T07:00:00Z')));
check('null timezone is always active', isActiveHour(null, new Date('2026-06-29T07:00:00Z')));

// ---- incremental + idempotency (the real recurring use case) ----
console.log('\n-- incremental sync --');
// Only the first two rounds have been played so far (roundIds 4 and 5).
const earlyRoundIds = roundIds.slice(0, 2);
const earlySingles = apiSingles.filter((m) =>
	earlyRoundIds.includes((m as unknown as RawMatch).roundId)
);
const partial = computeResults(draw_size, seeds, original, earlySingles);
const r16Decided = partial.results.slice(0, 24).every((r) => r?.winner != null); // 16 + 8 matches
const laterUndecided = partial.results.slice(24).every((r) => (r?.winner ?? null) === null);
check('first two rounds (24 matches) decided from partial data', r16Decided);
check('quarters onward remain undecided', laterUndecided);

// Now the rest of the tournament finishes: feed full results to the partial state.
const finished = computeResults(draw_size, seeds, partial.results, apiSingles);
check('finishing fills the remaining matches', finished.filled === draw_size - 1 - 24);
check('finishing reports changed', finished.changed === true);

// Re-running on a complete bracket is a no-op.
const again = computeResults(draw_size, seeds, finished.results, apiSingles);
check('re-running complete bracket is idempotent (no change)', again.changed === false);

// A manually-set winner is never overwritten by the API.
const manual: Result[] = original.map((_, i) =>
	i === 0 ? { player_a: 0, player_b: 1, winner: 1, score: null } : null
);
const apiSaysZeroWon = computeResults(draw_size, seeds, manual, [
	{
		match_winner: playerOf(final.player1Id).id,
		player1: { id: 0, name: seeds[0]!.name },
		player2: { id: 1, name: seeds[1]!.name }
	} as unknown as ApiMatch
]);
check('existing (manual) winner is preserved', apiSaysZeroWon.results[0]?.winner === 1);

console.log(`\n${pass ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}`);
process.exit(pass ? 0 : 1);
