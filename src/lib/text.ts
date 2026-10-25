// "1 review", "3 reviews": n followed by the singular or plural noun.
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
