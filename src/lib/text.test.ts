import { expect, test } from 'vitest';
import { plural } from './text';

test('plural picks the singular only for 1', () => {
  expect([plural(1, 'day in a row', 'days in a row'), plural(0, 'review', 'reviews'), plural(3, 'miss', 'misses')])
    .toEqual(['1 day in a row', '0 reviews', '3 misses']);
});
