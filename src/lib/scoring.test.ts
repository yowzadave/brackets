import { describe, it, expect } from 'vitest';
import { bracketScore, maxBracketScore } from './scoring';

// --- helpers -----------------------------------------------------------------

type Entry = {
	player_a: number | null;
	player_b: number | null;
	winner: number | null;
	score: null | object;
};

// A single match entry. Pass `null` for `winner` to leave the match undecided.
function match(
	player_a: number | null,
	player_b: number | null,
	winner: number | null = null
): Entry {
	return { player_a, player_b, winner, score: null };
}

// A seed (player). `seed` may be an integer, a non-numeric string (unseeded,
// e.g. a qualifier), or null.
function seed(seed: number | string | null) {
	return { name: `p${seed}`, seed };
}

// --- standard scoring --------------------------------------------------------

describe('standard scoring', () => {
	// 4-player draw: round 0 worth 1pt/match, the final worth 2pts.
	const seeds = [seed(1), seed(2), seed(3), seed(4)];

	it('scores a perfect, fully-decided bracket', () => {
		const results = [match(0, 1, 0), match(2, 3, 2), match(0, 2, 0)];
		const picks = [match(0, 1, 0), match(2, 3, 2), match(0, 2, 0)];

		// 1 (semi) + 1 (semi) + 2 (final) = 4
		expect(bracketScore(4, results, picks, seeds, 'standard')).toBe(4);
		expect(maxBracketScore(4, results, picks, seeds, 'standard')).toBe(4);
	});

	it('only credits correct picks', () => {
		const results = [match(0, 1, 0), match(2, 3, 2), match(0, 2, 0)];
		// final picked wrong
		const picks = [match(0, 1, 0), match(2, 3, 2), match(0, 2, 2)];

		expect(bracketScore(4, results, picks, seeds, 'standard')).toBe(2); // two semis
	});

	it('defaults to the standard method when none is given', () => {
		const results = [match(0, 1, 0), match(2, 3, 2), match(0, 2, 0)];
		const picks = [match(0, 1, 0), match(2, 3, 2), match(0, 2, 0)];

		expect(bracketScore(4, results, picks, seeds)).toBe(4);
		expect(bracketScore(4, results, picks)).toBe(4); // seeds optional for standard
	});

	// 8-player draw: round 0 = 1, round 1 = 2, final = 4.
	it('scores a larger (8-player) draw', () => {
		const eightSeeds = [0, 1, 2, 3, 4, 5, 6, 7].map((n) => seed(n + 1));
		// round 0 (idx 0-3), round 1 (idx 4-5), final (idx 6)
		const results = [
			match(0, 1, 0),
			match(2, 3, 2),
			match(4, 5, 4),
			match(6, 7, 6),
			match(0, 2, 0),
			match(4, 6, 4),
			match(0, 4, 0)
		];
		const picks = [...results];

		// 4 * 1 (round 0) + 2 * 2 (round 1) + 4 (final) = 12
		expect(bracketScore(8, results, picks, eightSeeds, 'standard')).toBe(12);
	});
});

// --- standard scoring: max (potential) ---------------------------------------

describe('standard max score', () => {
	const seeds = [seed(1), seed(2), seed(3), seed(4)];

	it('counts undecided, still-winnable matches as potential points', () => {
		const results = [
			match(0, 1, 0), // decided
			match(2, 3, null), // undecided
			match(0, null, null) // final, opponent not yet known
		];
		const picks = [match(0, 1, 0), match(2, 3, 2), match(0, 2, 0)];

		// best case: 1 (won) + 1 (winnable) + 2 (winnable final) = 4
		expect(maxBracketScore(4, results, picks, seeds, 'standard')).toBe(4);
	});

	it('drops matches whose picked winner is already eliminated', () => {
		const results = [
			match(0, 1, 1), // user picked 0, but 1 won -> 0 eliminated
			match(2, 3, null), // undecided
			match(1, null, null) // final
		];
		const picks = [match(0, 1, 0), match(2, 3, 2), match(0, 2, 0)];

		// match0 wrong (0), match1 still winnable (+1), final picks eliminated 0 (0)
		expect(bracketScore(4, results, picks, seeds, 'standard')).toBe(0);
		expect(maxBracketScore(4, results, picks, seeds, 'standard')).toBe(1);
	});
});

// --- served scoring ----------------------------------------------------------

describe('served scoring', () => {
	it('awards 10 points per round, +10 each subsequent round', () => {
		// 4-player draw, all favorites win (no bonuses): round 0 = 10, final = 20.
		const seeds = [seed(1), seed(4), seed(2), seed(3)];
		const results = [match(0, 1, 0), match(2, 3, 2), match(0, 2, 0)];
		const picks = [...results];

		// 10 + 10 + 20 = 40
		expect(bracketScore(4, results, picks, seeds, 'served')).toBe(40);
	});

	it('applies the seed-gap bonus when an underdog wins', () => {
		// match 0: seed 20 beats seed 10 -> +10 bonus on top of 10 = 20
		const seeds = [seed(10), seed(20), seed(5), seed(8)];
		const results = [
			match(0, 1, 1), // s20 beats s10 -> base 10 + gap 10 = 20
			match(2, 3, 2), // s5 beats s8 (favorite) -> base 10
			match(1, 2, 2) // final: s5 beats s20 (favorite) -> base 20, no gap
		];
		const picks = [...results];

		expect(bracketScore(4, results, picks, seeds, 'served')).toBe(50);
	});

	it('doubles points for an unseeded player upsetting a seeded one', () => {
		// player 1 is a qualifier ("Q" does not coerce to an integer)
		const seeds = [seed(1), seed('Q'), seed(2), seed(3)];
		const results = [
			match(0, 1, 1), // unseeded beats s1 -> 10 * 2 = 20
			match(2, 3, 2), // s2 beats s3 -> base 10
			match(1, 2, 1) // final: unseeded beats s2 -> 20 * 2 = 40
		];
		const picks = [...results];

		expect(bracketScore(4, results, picks, seeds, 'served')).toBe(70);
	});

	it('does not bonus a seeded player beating an unseeded one', () => {
		const seeds = [seed(1), seed('Q'), seed(2), seed(3)];
		const results = [
			match(0, 1, 0), // s1 beats unseeded -> base 10, no bonus
			match(2, 3, 2),
			match(0, 2, 0)
		];
		const picks = [...results];

		// 10 + 10 + 20 = 40
		expect(bracketScore(4, results, picks, seeds, 'served')).toBe(40);
	});

	it('adds quarter/semi/final bonuses on a draw with more than 3 rounds', () => {
		// 16-player draw (4 rounds). One correct, favorite-wins pick per round so
		// only the base + round bonuses apply (no upset/gap bonuses).
		const seeds = Array(16).fill(null);
		seeds[0] = seed(1);
		seeds[1] = seed(16);
		seeds[2] = seed(8);
		seeds[4] = seed(4);
		seeds[8] = seed(2);

		const results = Array(15).fill(null);
		const picks = Array(15).fill(null);

		// round 0 (match 0): base 10
		results[0] = match(0, 1, 0);
		picks[0] = match(0, 1, 0);
		// round 1 / quarterfinal (match 8): base 20 + 10 = 30
		results[8] = match(0, 2, 0);
		picks[8] = match(0, 2, 0);
		// round 2 / semifinal (match 12): base 30 + 20 = 50
		results[12] = match(0, 4, 0);
		picks[12] = match(0, 4, 0);
		// round 3 / final (match 14): base 40 + 30 = 70
		results[14] = match(0, 8, 0);
		picks[14] = match(0, 8, 0);

		// 10 + 30 + 50 + 70 = 160
		expect(bracketScore(16, results, picks, seeds, 'served')).toBe(160);
	});
});

// --- served scoring: max (potential) -----------------------------------------

describe('served max score', () => {
	it('projects potential points off the user’s own picked matchups', () => {
		const seeds = [seed(1), seed(16), seed(2), seed(3)];
		const results = [
			match(0, 1, 0), // decided, correct
			match(2, 3, null), // undecided
			match(0, null, null) // final, opponent unknown
		];
		const picks = [match(0, 1, 0), match(2, 3, 2), match(0, 2, 0)];

		// match0: s1 beats s16 -> base 10
		// match1: projected s2 beats s3 -> base 10
		// final: projected s1 beats s2 -> base 20
		expect(maxBracketScore(4, results, picks, seeds, 'served')).toBe(40);
		expect(bracketScore(4, results, picks, seeds, 'served')).toBe(10);
	});
});
