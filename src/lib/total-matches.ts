function totalMatches(draw_size: number): number {
  const rounds = Math.log2(draw_size);
  return (2 ** rounds) - 1;
}

export default totalMatches;
