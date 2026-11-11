import { describe, expect, it } from 'vitest';
import { astarSteps, pointKey } from '../../src/core/astar';
import { seededRandom } from '../../src/core/seededRandom';
import type { SearchResult } from '../../src/core/types';

function run(rows: number, cols: number, start = { row: 0, col: 0 }, goal = { row: rows - 1, col: cols - 1 }, walls = new Set<string>()): SearchResult {
  const iterator = astarSteps(walls, rows, cols, start, goal);
  let step = iterator.next();
  while (!step.done && !step.value.done) step = iterator.next();
  return step.value.result!;
}

describe('astarSteps', () => {
  it('returns a shortest path including both endpoints', () => {
    const result = run(5, 5);
    expect(result.status).toBe('success');
    expect(result.cost).toBe(8);
    expect(result.path).toHaveLength(9);
  });

  it('routes around a wall and reports no-path when separated', () => {
    const walls = new Set([1, 2, 3].map((col) => pointKey({ row: 2, col })));
    expect(run(5, 5, { row: 2, col: 0 }, { row: 2, col: 4 }, walls).cost).toBe(6);
    expect(run(5, 5, { row: 2, col: 0 }, { row: 2, col: 4 }, new Set([0, 1, 2, 3, 4].map((row) => pointKey({ row, col: 2 })))).status).toBe('no-path');
  });

  it('supports start equal to goal and rejects invalid points', () => {
    expect(run(3, 3, { row: 1, col: 1 }, { row: 1, col: 1 }).cost).toBe(0);
    expect(() => run(3, 3, { row: -1, col: 0 })).toThrow(RangeError);
  });

  it('produces deterministic event sequences', () => {
    const collect = () => [...astarSteps(new Set(), 5, 5, { row: 0, col: 0 }, { row: 4, col: 4 })];
    expect(collect()).toEqual(collect());
  });

  it('matches BFS reachability and shortest cost on seeded obstacle maps', () => {
    for (let seed = 0; seed < 200; seed++) {
      const random = seededRandom(seed);
      const rows = 8;
      const cols = 9;
      const start = { row: 0, col: 0 };
      const goal = { row: rows - 1, col: cols - 1 };
      const walls = new Set<string>();
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const point = { row, col };
        if (pointKey(point) !== pointKey(start) && pointKey(point) !== pointKey(goal) && random() < 0.28) walls.add(pointKey(point));
      }
      const queue = [start];
      const distances = new Map([[pointKey(start), 0]]);
      for (let index = 0; index < queue.length; index++) {
        const point = queue[index];
        for (const direction of [{ row: -1, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 0, col: -1 }]) {
          const next = { row: point.row + direction.row, col: point.col + direction.col };
          const key = pointKey(next);
          if (next.row < 0 || next.row >= rows || next.col < 0 || next.col >= cols || walls.has(key) || distances.has(key)) continue;
          distances.set(key, distances.get(pointKey(point))! + 1);
          queue.push(next);
        }
      }
      const result = run(rows, cols, start, goal, walls);
      const expected = distances.get(pointKey(goal));
      expect(result.status, `seed ${seed}`).toBe(expected === undefined ? 'no-path' : 'success');
      if (expected !== undefined) {
        expect(result.cost, `seed ${seed}`).toBe(expected);
        expect(result.path[0]).toEqual(start);
        expect(result.path.at(-1)).toEqual(goal);
        expect(result.path.every((point, index) => !walls.has(pointKey(point)) && (index === 0 || Math.abs(point.row - result.path[index - 1].row) + Math.abs(point.col - result.path[index - 1].col) === 1))).toBe(true);
      }
    }
  });
});