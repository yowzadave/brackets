import { getRounds, getMatches } from '$lib/bracket-utils';

type Result = {
  winner: number | null;
  score: null | object;
  player_a: number | null;
  player_b: number | null;
};

type Seed = {
  name: string;
  seed: number | string | null;
  country?: string | null;
};

type Round = {
  index: number;
  name: string;
  matches: number;
  first_match: number;
  value: number;
};

type ScoringMethod = 'standard' | 'served';

// Returns the player's seed as an integer, or null if the seed does not coerce
// to an integer (i.e. the player is "unseeded").
function seedNumber(seed: Seed | null | undefined): number | null {
  if (seed == null || seed.seed == null) return null;
  const n = Number(seed.seed);
  return Number.isInteger(n) ? n : null;
}

// Points awarded for a single correctly-predicted match under the "standard"
// method: the round's value (powers of two by round depth).
function standardMatchPoints(round: Round) {
  return round.value;
}

// Points awarded for a single correctly-predicted match under the "served"
// method, given the winner and the player they beat.
function servedMatchPoints(
  round: Round,
  total_rounds: number,
  winner_seed: number | null,
  loser_seed: number | null
) {
  // Round 1 is worth 10 points/pick, each subsequent round 10 more.
  let base = 10 * (round.index + 1);

  // Brackets with more than 3 rounds get extra bonuses for the last three.
  if (total_rounds > 3) {
    if (round.index === total_rounds - 1) {
      base += 30; // final
    } else if (round.index === total_rounds - 2) {
      base += 20; // semifinal
    } else if (round.index === total_rounds - 3) {
      base += 10; // quarterfinal
    }
  }

  const winner_seeded = winner_seed != null;
  const loser_seeded = loser_seed != null;

  // Unseeded upset bonus: an unseeded player beating a seeded player is worth
  // double.
  if (!winner_seeded && loser_seeded) {
    return base * 2;
  }

  // Seed gap bonus: a lower-ranked (higher seed number) player beating a
  // higher-ranked (lower seed number) player earns the seed difference.
  if (winner_seeded && loser_seeded && winner_seed > loser_seed) {
    return base + (winner_seed - loser_seed);
  }

  return base;
}

// Points a correctly-predicted match is worth, dispatched by scoring method.
// `winner` and `loser` are player indices into `seeds` for the matchup.
function matchPoints(
  scoring_method: ScoringMethod,
  round: Round,
  total_rounds: number,
  seeds: Seed[],
  winner: number | null,
  loser: number | null
) {
  if (scoring_method === 'served') {
    return servedMatchPoints(
      round,
      total_rounds,
      seedNumber(seeds[winner ?? -1]),
      seedNumber(seeds[loser ?? -1])
    );
  }

  return standardMatchPoints(round);
}

function bracketScore(
  draw_size: number,
  results: Result[],
  picks: Result[],
  seeds: Seed[] = [],
  scoring_method: ScoringMethod = 'standard'
) {
  const rounds = getRounds(draw_size);
  const matches = getMatches(draw_size, rounds);
  return matches.reduce((score, match) => {
    const result = results[match.match_index];
    const pick = picks[match.match_index];
    const round = rounds[match.round];

    if (result?.winner != undefined && result.winner === pick?.winner) {
      const loser = result.winner === result.player_a ? result.player_b : result.player_a;
      return score + matchPoints(scoring_method, round, rounds.length, seeds, result.winner, loser);
    } else {
      return score;
    }
  }, 0);
}

function maxBracketScore(
  draw_size: number,
  results: Result[],
  picks: Result[],
  seeds: Seed[] = [],
  scoring_method: ScoringMethod = 'standard'
) {
  const rounds = getRounds(draw_size);
  const matches = getMatches(draw_size, rounds);
  const eliminated = new Set<number>();

  matches.forEach((match) => {
    const result = results[match.match_index];
    const pick = picks[match.match_index];

    if (result?.winner != undefined) {
      const loser = result.winner === result.player_a ? result.player_b : result.player_a;
      if (loser != null) {
        eliminated.add(loser);
      }

      if (pick?.winner !== result.winner) {
        if (pick?.player_a != null) eliminated.add(pick.player_a);
        if (pick?.player_b != null) eliminated.add(pick.player_b);
      }
    }
  });

  return matches.reduce((score, match) => {
    const result = results[match.match_index];
    const pick = picks[match.match_index];

    const round = rounds[match.round];

    const player_a_eliminated = result?.player_a != null && eliminated.has(result.player_a);
    const player_b_eliminated = result?.player_b != null && eliminated.has(result.player_b);
    const cannot_win =
      (player_a_eliminated && player_b_eliminated) ||
      (pick?.winner != null && eliminated.has(pick.winner));

    if (result?.winner == undefined && !cannot_win) {
      // Undecided but still winnable: project the points off the user's own
      // bracket (their picked winner beating their picked opponent).
      const loser = pick?.winner === pick?.player_a ? pick?.player_b : pick?.player_a;
      return score + matchPoints(scoring_method, round, rounds.length, seeds, pick?.winner ?? null, loser ?? null);
    } else if (result?.winner != undefined && result.winner === pick?.winner) {
      const loser = result.winner === result.player_a ? result.player_b : result.player_a;
      return score + matchPoints(scoring_method, round, rounds.length, seeds, result.winner, loser);
    } else {
      return score;
    }
  }, 0);
}

export { bracketScore, maxBracketScore };
export type { ScoringMethod };
