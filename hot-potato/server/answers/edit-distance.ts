const cell = (
  left: string,
  right: string,
  i: number,
  j: number,
  previous: Uint16Array,
  before: Uint16Array,
  current: Uint16Array,
): number => {
  const cost = left[i - 1] === right[j - 1] ? 0 : 1;
  const basic = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
  if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1])
    return Math.min(basic, before[j - 2] + 1);
  return basic;
};

export const editDistance = (left: string, right: string, limit = 2): number => {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  let before = new Uint16Array(right.length + 1).fill(limit + 1);
  let previous = Uint16Array.from({ length: right.length + 1 }, (_, index) => index);
  let current = new Uint16Array(right.length + 1);
  for (let i = 1; i <= left.length; i += 1) {
    current.fill(limit + 1);
    current[0] = i;
    let minimum = current[0];
    for (let j = Math.max(1, i - limit); j <= Math.min(right.length, i + limit); j += 1) {
      current[j] = cell(left, right, i, j, previous, before, current);
      minimum = Math.min(minimum, current[j]);
    }
    if (minimum > limit) return limit + 1;
    [before, previous, current] = [previous, current, before];
  }
  return previous[right.length];
};
