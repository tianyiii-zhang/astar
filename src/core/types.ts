export type Point = { row: number; col: number };

export type SearchEvent =
  | { type: 'select'; point: Point; g: number; h: number; f: number }
  | { type: 'relax'; point: Point; g: number; h: number; f: number; parent: Point }
  | { type: 'close'; point: Point }
  | { type: 'found'; path: Point[]; cost: number }
  | { type: 'no-path' };

export type SearchResult = {
  status: 'success' | 'no-path';
  path: Point[];
  cost: number;
  expanded: number;
};

export type SearchStep = {
  events: SearchEvent[];
  done: boolean;
  result?: SearchResult;
};