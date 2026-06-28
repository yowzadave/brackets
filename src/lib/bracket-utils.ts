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

function getParentMatch(match_index: number, player: 'player_a' | 'player_b', matches: Match[], round_match_indices: number[]): number | null {
  const match = matches[match_index];
  if (match.round <= 0) return null;
  const index_in_round = match_index - round_match_indices[match.round];
  const pm = round_match_indices[match.round - 1] + index_in_round * 2;
  return player === 'player_a' ? pm : pm + 1;
}

export { getMatchCountByRound, getMatchCountIndices, getRounds, getMatches, getParentMatch };
