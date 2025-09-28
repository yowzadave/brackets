type Round = {
  index: number;
  name: string;
  matches: number;
  first_match: number;
};

type Match = {
  round: number;
  match_index: number;
};

type Result = {
  winner: number | null;
  score: null | object;
  player_a: number | null;
  player_b: number | null;
}

function getMatchCountByRound(draw_size: number) {
  const r = Math.log2(draw_size);
  return Array.from({ length: r }, (_, index) => draw_size / 2 ** (index + 1));
}

function getMatchCountIndices(match_count_by_round: number[]) {
  const mci = [0];
  match_count_by_round.slice(0, -1).forEach((count) => {
    mci.push(mci[mci.length - 1] + count);
  });
  return mci;
}

function getRounds(draw_size: number) {
  const r = Math.log2(draw_size);

  let fm = 0;
  return Array.from({ length: r }, (_, index) => {
    const competitors = 2 ** (r - index);
    const matches = competitors / 2;

    let name = `R${competitors}`;
    if (index === r - 1) name = 'Final';
    if (index === r - 2) name = 'Semis';
    if (index === r - 3) name = 'Quarters';

    const first_match = fm;
    fm += matches;

    return {
      name,
      index,
      matches,
      value: draw_size / competitors,
      first_match,
    };
  });
}

function getMatches(draw_size: number, rounds: Round[]): Match[] {
  return rounds.reduce(
    (acc, round) => {
      const r = Array.from({ length: acc.remaining }, (_, i) => {
        return {
          round: round.index,
          match_index: acc.total + i
        };
      });
      acc.matches.push(...r);
      acc.remaining /= 2;
      acc.total += r.length;

      return acc;
    },
    { matches: [], remaining: draw_size / 2, total: 0 }
  ).matches;
}

function bracketScore(draw_size: number, results: Result[], picks: Result[]) {
  const rounds = getRounds(draw_size);
  const matches = getMatches(draw_size, rounds);
  return matches.reduce((score, match) => {
    const result = results[match.match_index];
    const pick = picks[match.match_index];
    const round = rounds[match.round];

    if (result?.winner != undefined && result.winner === pick?.winner) {
      return score + round.value;
    } else {
      return score;
    }
  }, 0);
}

export { getMatchCountByRound, getMatchCountIndices, getRounds, getMatches, bracketScore };
