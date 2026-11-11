import type { Point } from './types';
import { pointKey } from './astar';
import { seededRandom } from './seededRandom';

const directions: Point[] = [{ row: -2, col: 0 }, { row: 0, col: 2 }, { row: 2, col: 0 }, { row: 0, col: -2 }];

export function reachableDistances(walls: ReadonlySet<string>, rows: number, cols: number, start: Point): Map<string, number> {
  const distances = new Map<string, number>([[pointKey(start), 0]]);
  const queue = [start];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    const distance = distances.get(pointKey(current))!;
    for (const direction of directions.map(({ row, col }) => ({ row: row / 2, col: col / 2 }))) {
      const next = { row: current.row + direction.row, col: current.col + direction.col };
      const key = pointKey(next);
      if (next.row < 0 || next.row >= rows || next.col < 0 || next.col >= cols || walls.has(key) || distances.has(key)) continue;
      distances.set(key, distance + 1);
      queue.push(next);
    }
  }
  return distances;
}

export function chooseReachableGoal(walls: ReadonlySet<string>, rows: number, cols: number, start: Point, random: () => number): Point | null {
  const distances = new Map<string, number>([[pointKey(start), 0]]);
  const queue = [start];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const direction of [{ row: -1, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 0, col: -1 }]) {
      const next = { row: current.row + direction.row, col: current.col + direction.col };
      const key = pointKey(next);
      if (next.row < 0 || next.row >= rows || next.col < 0 || next.col >= cols || walls.has(key) || distances.has(key)) continue;
      distances.set(key, distances.get(pointKey(current))! + 1);
      queue.push(next);
    }
  }
  const candidates = [...distances].filter(([key]) => key !== pointKey(start)).sort((a, b) => a[1] - b[1]);
  if (candidates.length === 0) return null;
  const farCandidates = candidates.slice(Math.floor(candidates.length / 2));
  const [key] = farCandidates[Math.floor(random() * farCandidates.length)];
  const [row, col] = key.split(',').map(Number);
  return { row, col };
}

export function generateMaze(rows: number, cols: number, start: Point, seed: number, loopCount = 8): { walls: Set<string>; goal: Point | null } {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 3 || cols < 3 || rows % 2 === 0 || cols % 2 === 0) {
    throw new RangeError('迷宫尺寸必须是大于等于 3 的奇数');
  }
  const random = seededRandom(seed);
  const walls = new Set<string>();
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) walls.add(pointKey({ row, col }));
  const firstRoom = { row: 1, col: 1 };
  const visited = new Set([pointKey(firstRoom)]);
  const stack = [firstRoom];
  walls.delete(pointKey(firstRoom));
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const options = directions
      .map((direction) => ({ row: current.row + direction.row, col: current.col + direction.col, wall: { row: current.row + direction.row / 2, col: current.col + direction.col / 2 } }))
      .filter(({ row, col }) => row > 0 && row < rows - 1 && col > 0 && col < cols - 1 && !visited.has(pointKey({ row, col })));
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const next = options[Math.floor(random() * options.length)];
    walls.delete(pointKey(next.wall));
    walls.delete(pointKey(next));
    visited.add(pointKey(next));
    stack.push({ row: next.row, col: next.col });
  }

  walls.delete(pointKey(start));
  const openKeys = [...Array(rows * cols)].map((_, index) => pointKey({ row: Math.floor(index / cols), col: index % cols })).filter((key) => !walls.has(key));
  const nearest = openKeys.filter((key) => key !== pointKey(start)).map((key) => {
    const [row, col] = key.split(',').map(Number);
    return { point: { row, col }, distance: Math.abs(row - start.row) + Math.abs(col - start.col) };
  }).sort((a, b) => a.distance - b.distance || a.point.row - b.point.row || a.point.col - b.point.col)[0].point;
  let row = start.row;
  let col = start.col;
  while (row !== nearest.row) {
    row += Math.sign(nearest.row - row);
    walls.delete(pointKey({ row, col }));
  }
  while (col !== nearest.col) {
    col += Math.sign(nearest.col - col);
    walls.delete(pointKey({ row, col }));
  }

  const loopCandidates: Point[] = [];
  for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
    const point = { row: r, col: c };
    if (!walls.has(pointKey(point))) continue;
    const vertical = !walls.has(pointKey({ row: r - 1, col: c })) && !walls.has(pointKey({ row: r + 1, col: c }));
    const horizontal = !walls.has(pointKey({ row: r, col: c - 1 })) && !walls.has(pointKey({ row: r, col: c + 1 }));
    if (vertical || horizontal) loopCandidates.push(point);
  }
  for (let count = 0; count < Math.min(loopCount, loopCandidates.length); count++) {
    const index = Math.floor(random() * loopCandidates.length);
    walls.delete(pointKey(loopCandidates[index]));
    loopCandidates.splice(index, 1);
  }
  return { walls, goal: chooseReachableGoal(walls, rows, cols, start, random) };
}