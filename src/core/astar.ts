import { MinHeap } from './minHeap';
import type { Point, SearchEvent, SearchResult, SearchStep } from './types';

type Entry = { point: Point; g: number; h: number; order: number };

const keyOf = ({ row, col }: Point): string => `${row},${col}`;
const heuristic = (a: Point, b: Point): number => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

export function* astarSteps(
  walls: ReadonlySet<string>,
  rows: number,
  cols: number,
  start: Point,
  goal: Point,
): Generator<SearchStep> {
  const inBounds = ({ row, col }: Point) => row >= 0 && row < rows && col >= 0 && col < cols;
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || !inBounds(start) || !inBounds(goal) || walls.has(keyOf(start)) || walls.has(keyOf(goal))) {
    throw new RangeError('起点、终点或网格尺寸无效');
  }

  const startKey = keyOf(start);
  const goalKey = keyOf(goal);
  const scores = new Map<string, number>([[startKey, 0]]);
  const parents = new Map<string, Point>();
  const closed = new Set<string>();
  let order = 0;
  let expanded = 0;
  const open = new MinHeap<Entry>((a, b) => a.g + a.h - b.g - b.h || a.h - b.h || a.order - b.order);
  open.push({ point: start, g: 0, h: heuristic(start, goal), order: order++ });
  const directions: Point[] = [{ row: -1, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 0, col: -1 }];

  while (open.size > 0) {
    const current = open.pop()!;
    const currentKey = keyOf(current.point);
    if (current.g !== scores.get(currentKey) || closed.has(currentKey)) continue;

    const events: SearchEvent[] = [{ type: 'select', point: current.point, g: current.g, h: current.h, f: current.g + current.h }];
    if (currentKey === goalKey) {
      const path = [current.point];
      let cursor = currentKey;
      while (parents.has(cursor)) {
        const parent = parents.get(cursor)!;
        path.push(parent);
        cursor = keyOf(parent);
      }
      path.reverse();
      const result: SearchResult = { status: 'success', path, cost: current.g, expanded };
      events.push({ type: 'found', path, cost: current.g });
      yield { events, done: true, result };
      return;
    }

    closed.add(currentKey);
    expanded++;
    events.push({ type: 'close', point: current.point });
    for (const direction of directions) {
      const next = { row: current.point.row + direction.row, col: current.point.col + direction.col };
      const nextKey = keyOf(next);
      if (!inBounds(next) || walls.has(nextKey) || closed.has(nextKey)) continue;
      const tentativeG = current.g + 1;
      if (tentativeG >= (scores.get(nextKey) ?? Infinity)) continue;
      const h = heuristic(next, goal);
      scores.set(nextKey, tentativeG);
      parents.set(nextKey, current.point);
      open.push({ point: next, g: tentativeG, h, order: order++ });
      events.push({ type: 'relax', point: next, g: tentativeG, h, f: tentativeG + h, parent: current.point });
    }
    yield { events, done: false };
  }

  yield { events: [{ type: 'no-path' }], done: true, result: { status: 'no-path', path: [], cost: Infinity, expanded } };
}

export function pointKey(point: Point): string {
  return keyOf(point);
}