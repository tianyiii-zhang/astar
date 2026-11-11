import { describe, expect, it } from 'vitest';
import { generateMaze, chooseReachableGoal } from '../../src/core/maze';
import { pointKey } from '../../src/core/astar';

function bfs(walls: ReadonlySet<string>, rows: number, cols: number, start: { row: number; col: number }): Set<string> {
  const seen = new Set([pointKey(start)]);
  const queue = [start];
  for (let index = 0; index < queue.length; index++) {
    const point = queue[index];
    for (const direction of [{ row: -1, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 0, col: -1 }]) {
      const next = { row: point.row + direction.row, col: point.col + direction.col };
      const key = pointKey(next);
      if (next.row < 0 || next.row >= rows || next.col < 0 || next.col >= cols || walls.has(key) || seen.has(key)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return seen;
}

describe('generateMaze', () => {
  it('is reproducible and keeps a reachable endpoint distinct from start', () => {
    const start = { row: 0, col: 0 };
    const first = generateMaze(15, 21, start, 912, 12);
    const second = generateMaze(15, 21, start, 912, 12);
    expect([...first.walls].sort()).toEqual([...second.walls].sort());
    expect(first.goal).toEqual(second.goal);
    expect(first.walls.has(pointKey(start))).toBe(false);
    expect(first.goal).not.toEqual(start);
  });

  it('reports no endpoint when no other passage exists', () => {
    expect(chooseReachableGoal(new Set(), 1, 1, { row: 0, col: 0 }, () => 0)).toBeNull();
  });

  it('keeps every passage reachable from edge, corner, and interior starts', () => {
    const starts = [{ row: 0, col: 0 }, { row: 7, col: 10 }, { row: 6, col: 9 }];
    for (let seed = 0; seed < 100; seed++) {
      const start = starts[seed % starts.length];
      const { walls, goal } = generateMaze(15, 21, start, seed, seed % 16);
      const reachable = bfs(walls, 15, 21, start);
      const passages = 15 * 21 - walls.size;
      expect(reachable.size, `seed ${seed}`).toBe(passages);
      expect(goal, `seed ${seed}`).not.toBeNull();
      expect(reachable.has(pointKey(goal!))).toBe(true);
      expect(walls.has(pointKey(start))).toBe(false);
    }
  });

  it('rejects invalid dimensions', () => {
    expect(() => generateMaze(14, 21, { row: 0, col: 0 }, 1)).toThrow(RangeError);
  });
});