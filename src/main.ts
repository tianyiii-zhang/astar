import { astarSteps, pointKey } from './core/astar';
import { generateMaze, chooseReachableGoal } from './core/maze';
import type { Point, SearchEvent, SearchResult, SearchStep } from './core/types';
import './styles.css';

type Mode = 'wall' | 'erase' | 'start';
type Status = 'idle' | 'running' | 'paused' | 'success' | 'no-path' | 'generating';

const presets = { compact: [15, 21], standard: [21, 31], large: [31, 41] } as const;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const app = $('app');

app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="A* 寻路实验室首页"><span class="brand-mark">A*</span><span>寻路实验室</span></a>
      <div class="top-meta"><span class="live-dot"></span><span>交互式算法演示</span><span class="version">V 1.0</span></div>
    </header>
    <section class="intro" aria-labelledby="page-title">
      <div><p class="eyebrow">PATHFINDING / 01</p><h1 id="page-title">让算法的思路，<span>看得见。</span></h1><p class="subtitle">设置起点，生成迷宫，逐步观察 A* 如何找到最短路径。</p></div>
      <div class="formula-chip"><span>启发式搜索</span><strong>f(n) = g(n) + h(n)</strong></div>
    </section>
    <section class="toolbar" aria-label="地图工具">
      <div class="tool-group" role="group" aria-label="编辑工具">
        <button id="tool-start" class="tool-button" type="button" aria-pressed="false" title="选择通路格作为起点">设起点</button>
        <button id="tool-wall" class="tool-button active" type="button" aria-pressed="true" title="按住并拖动绘制墙壁">画墙</button>
        <button id="tool-erase" class="tool-button" type="button" aria-pressed="false" title="按住并拖动擦除墙壁">擦除</button>
      </div>
      <span class="toolbar-divider" aria-hidden="true"></span>
      <label class="select-wrap">网格<select id="size-select" aria-label="网格尺寸"><option value="compact">15 × 21</option><option value="standard" selected>21 × 31</option><option value="large">31 × 41</option></select></label>
      <button id="maze-button" class="button secondary" type="button" title="重新生成迷宫并随机放置可达终点">随机迷宫</button>
      <button id="goal-button" class="button secondary" type="button" title="在起点所在连通区域选择新终点">随机终点</button>
      <label class="loop-control">环路 <input id="loop-count" type="range" min="0" max="36" value="10" aria-label="迷宫环路数量"><output id="loop-value">10</output></label>
      <span class="toolbar-spacer"></span>
      <button id="clear-search" class="button quiet" type="button">清除搜索</button>
      <button id="clear-walls" class="button quiet" type="button">清空墙壁</button>
    </section>
    <div class="workspace">
      <section class="map-panel" aria-labelledby="map-title">
        <div class="panel-heading"><div><p class="eyebrow">LIVE GRID</p><h2 id="map-title">寻路地图</h2></div><div class="map-readout"><span id="map-dimensions">21 行 × 31 列</span><span id="map-status" class="status-pill" aria-live="polite">准备就绪</span></div></div>
        <div class="grid-scroll" id="grid-scroll"><svg id="grid" role="grid" aria-label="寻路网格，方向键移动焦点，Enter 使用当前工具" tabindex="0"></svg></div>
        <div class="legend" aria-label="地图图例">
          <span><i class="swatch start-swatch">S</i>起点</span><span><i class="swatch goal-swatch">E</i>终点</span><span><i class="swatch wall-swatch"></i>墙壁</span><span><i class="swatch open-swatch"></i>待探索</span><span><i class="swatch closed-swatch"></i>已扩展</span><span><i class="swatch current-swatch"></i>当前节点</span><span><i class="swatch path-swatch"></i>最终路径</span>
        </div>
        <div class="map-hint"><span id="tool-hint">拖动绘制墙壁；方向键移动焦点，Enter 操作选中格</span><span>四方向 · 单步代价 1</span></div>
      </section>
      <aside class="study-panel" aria-label="算法学习面板">
        <section class="study-section inspector-section"><div class="section-title"><span class="section-index">01</span><h2>节点检查器</h2></div><p id="inspector-coordinate" class="coordinate">选择一个格子</p><div class="score-grid"><div><span>G · 已走代价</span><strong id="score-g">—</strong></div><div><span>H · 估算剩余</span><strong id="score-h">—</strong></div><div class="score-total"><span>F · 综合优先级</span><strong id="score-f">—</strong></div></div><p id="parent-node" class="parent-node">父节点 <span>—</span></p></section>
        <section class="study-section"><div class="section-title"><span class="section-index">02</span><h2>算法步骤</h2></div><ol class="steps-list"><li id="pseudo-1" class="step-current"><b>01</b><span>取出 F 值最低的节点</span></li><li id="pseudo-2"><b>02</b><span>检查上、右、下、左邻居</span></li><li id="pseudo-3"><b>03</b><span>更新 G 值与父节点</span></li><li id="pseudo-4"><b>04</b><span>到达终点后回溯最短路径</span></li></ol></section>
        <section class="study-section stats-section"><div class="section-title"><span class="section-index">03</span><h2>本次搜索</h2></div><div class="stats-grid"><div><strong id="stat-length">—</strong><span>路径长度</span></div><div><strong id="stat-expanded">0</strong><span>已扩展节点</span></div><div><strong id="stat-time">0.0<span>ms</span></strong><span>计算耗时</span></div></div><p id="result-message" class="result-message" aria-live="polite">等待开始搜索</p></section>
      </aside>
    </div>
    <section class="player" aria-label="搜索播放控制">
      <div class="player-controls"><button id="run-button" class="button primary" type="button"><span aria-hidden="true">▶</span> 开始搜索</button><button id="step-button" class="button secondary step-button" type="button" title="处理一个有效弹出节点并暂停">单步</button><button id="reset-button" class="button icon-button" type="button" aria-label="重新运行搜索" title="重新运行">↺</button></div>
      <div class="speed-control"><label for="speed">播放速度</label><input id="speed" type="range" min="2" max="48" value="16"><output id="speed-value">16</output><span>节点 / 秒</span></div>
      <p class="player-note">寻路完成后可编辑地图，再次运行</p>
    </section>
    <footer><span>A* 寻路实验室</span><span>曼哈顿距离 · 不允许斜向移动</span></footer>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
  </main>`;

let rows = 21;
let cols = 31;
let start: Point = { row: 1, col: 1 };
let goal: Point = { row: 19, col: 29 };
let walls = new Set<string>();
let open = new Set<string>();
let closed = new Set<string>();
let path = new Set<string>();
let current: Point | null = null;
let scoreByKey = new Map<string, { g: number; h: number; f: number; parent?: Point }>();
let status: Status = 'idle';
let mode: Mode = 'wall';
let generator: Generator<SearchStep> | null = null;
let eventQueue: SearchEvent[] = [];
let queuedResult: SearchResult | undefined;
let expandedCount = 0;
let pathLength: number | null = null;
let computeMs = 0;
let runId = 0;
let frameId = 0;
let lastFrame = 0;
let budget = 0;
let drawing = false;
let focused: Point = { ...start };
let toastTimer = 0;
let nextSeed = 17;
let announced = '';

function showToast(message: string): void {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2600);
}

function canEdit(): boolean {
  return status !== 'running' && status !== 'paused' && status !== 'generating';
}

function setAnnouncement(message: string): void {
  announced = message;
  $('map-status').textContent = message;
}

function cellElements(key: string): { group: SVGGElement; rect: SVGRectElement; marker: SVGTextElement } | undefined {
  const group = $('grid').querySelector<SVGGElement>(`[data-key="${key}"]`);
  if (!group) return undefined;
  return { group, rect: group.querySelector('rect')!, marker: group.querySelector('.marker')! };
}

function renderCell(point: Point): void {
  const key = pointKey(point);
  const elements = cellElements(key);
  if (!elements) return;
  const { group, rect, marker } = elements;
  const isStart = key === pointKey(start);
  const isGoal = key === pointKey(goal);
  const isWall = walls.has(key) && !isStart && !isGoal;
  const isPath = path.has(key);
  const isCurrent = current !== null && key === pointKey(current);
  const isOpen = open.has(key);
  const isClosed = closed.has(key);
  rect.setAttribute('class', ['cell', isStart && 'start', isGoal && 'goal', isWall && 'wall', !isStart && !isGoal && isOpen && 'open', !isStart && !isGoal && isClosed && 'closed', !isStart && !isGoal && isPath && 'path', !isStart && !isGoal && isCurrent && 'current', key === pointKey(focused) && 'focused'].filter(Boolean).join(' '));
  marker.textContent = isStart ? 'S' : isGoal ? 'E' : '';
  group.setAttribute('aria-label', `${point.row + 1} 行 ${point.col + 1} 列${isStart ? '，起点' : isGoal ? '，终点' : isWall ? '，墙壁' : isPath ? '，最终路径' : isCurrent ? '，当前节点' : isClosed ? '，已扩展' : isOpen ? '，待探索' : '，通路'}`);
  group.classList.toggle('endpoint', isStart || isGoal);
}

function renderAllCells(): void {
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) renderCell({ row, col });
}

function buildGrid(): void {
  const grid = $('grid');
  grid.replaceChildren();
  grid.setAttribute('viewBox', `0 0 ${cols * 24} ${rows * 24}`);
  grid.setAttribute('width', String(cols * 24));
  grid.setAttribute('height', String(rows * 24));
  grid.setAttribute('aria-rowcount', String(rows));
  grid.setAttribute('aria-colcount', String(cols));
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < rows; row++) {
    const rowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    rowGroup.setAttribute('role', 'row');
    for (let col = 0; col < cols; col++) {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const point = { row, col };
      group.id = `cell-${row}-${col}`;
      group.dataset.key = pointKey(point);
      group.dataset.row = String(row);
      group.dataset.col = String(col);
      group.setAttribute('role', 'gridcell');
      group.setAttribute('aria-rowindex', String(row + 1));
      group.setAttribute('aria-colindex', String(col + 1));
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(col * 24 + 1));
      rect.setAttribute('y', String(row * 24 + 1));
      rect.setAttribute('width', '22');
      rect.setAttribute('height', '22');
      rect.setAttribute('rx', '3');
      rect.setAttribute('class', 'cell');
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      marker.setAttribute('x', String(col * 24 + 12));
      marker.setAttribute('y', String(row * 24 + 16));
      marker.setAttribute('text-anchor', 'middle');
      marker.setAttribute('class', 'marker');
      group.append(rect, marker);
      rowGroup.append(group);
    }
    fragment.append(rowGroup);
  }
  grid.append(fragment);
  renderAllCells();
  grid.setAttribute('aria-activedescendant', `cell-${focused.row}-${focused.col}`);
  const active = cellElements(pointKey(focused))?.group;
  active?.setAttribute('id', `cell-${focused.row}-${focused.col}`);
}

function renderControls(): void {
    $('run-button').innerHTML = status === 'running' ? '<span aria-hidden="true">Ⅱ</span> 暂停' : status === 'paused' ? '<span aria-hidden="true">▶</span> 继续' : '<span aria-hidden="true">▶</span> 开始搜索';
  $('run-button').setAttribute('aria-label', status === 'running' ? '暂停搜索' : status === 'paused' ? '继续搜索' : '开始搜索');
  $('step-button').toggleAttribute('disabled', status === 'running' || status === 'generating');
  $('reset-button').toggleAttribute('disabled', status === 'generating');
  for (const id of ['tool-start', 'tool-wall', 'tool-erase', 'size-select', 'maze-button', 'goal-button', 'clear-walls']) $(id).toggleAttribute('disabled', !canEdit());
  $('clear-search').toggleAttribute('disabled', status === 'generating');
  for (const name of ['start', 'wall', 'erase'] as const) {
    const button = $(`tool-${name}`);
    button.classList.toggle('active', mode === name);
    button.setAttribute('aria-pressed', String(mode === name));
  }
  $('map-dimensions').textContent = `${rows} 行 × ${cols} 列`;
  $('stat-expanded').textContent = String(expandedCount);
  $('stat-length').textContent = pathLength === null ? '—' : String(pathLength);
  $('stat-time').innerHTML = `${computeMs.toFixed(1)}<span>ms</span>`;
  $('result-message').textContent = announced === '找到最短路径' ? '找到最短路径' : announced === '没有可达路径' ? '没有可达路径' : status === 'running' ? '正在探索可行路线' : status === 'paused' ? '搜索已暂停' : status === 'success' ? '最短路径已找到' : status === 'no-path' ? '没有可达路径' : '等待开始搜索';
}

function clearSearch(update = true): void {
  runId++;
  cancelAnimationFrame(frameId);
  frameId = 0;
  generator = null;
  eventQueue = [];
  queuedResult = undefined;
  open.clear();
  closed.clear();
  path.clear();
  scoreByKey.clear();
  current = null;
  expandedCount = 0;
  pathLength = null;
  computeMs = 0;
  budget = 0;
  lastFrame = 0;
  status = 'idle';
  setAnnouncement('准备就绪');
  renderAllCells();
  renderInspector(null);
  if (update) renderControls();
}

function renderInspector(point: Point | null): void {
  if (!point) {
    $('inspector-coordinate').textContent = '选择一个格子';
    $('score-g').textContent = $('score-h').textContent = $('score-f').textContent = '—';
    $('parent-node').innerHTML = '父节点 <span>—</span>';
    return;
  }
  const score = scoreByKey.get(pointKey(point));
  $('inspector-coordinate').textContent = `第 ${point.row + 1} 行 · 第 ${point.col + 1} 列`;
  $('score-g').textContent = score ? String(score.g) : '—';
  $('score-h').textContent = score ? String(score.h) : '—';
  $('score-f').textContent = score ? String(score.f) : '—';
  $('parent-node').innerHTML = score?.parent ? `父节点 <span>(${score.parent.row + 1}, ${score.parent.col + 1})</span>` : '父节点 <span>—</span>';
}

function createSearch(): void {
  clearSearch(false);
  generator = astarSteps(walls, rows, cols, start, goal);
  status = 'paused';
  setAnnouncement('搜索已就绪');
  renderControls();
}

function applyEvent(event: SearchEvent): void {
  if (event.type === 'select') {
    current = event.point;
    scoreByKey.set(pointKey(event.point), { g: event.g, h: event.h, f: event.f, parent: scoreByKey.get(pointKey(event.point))?.parent });
    renderInspector(event.point);
    $('pseudo-1').classList.add('step-current');
    $('pseudo-2').classList.remove('step-current');
    renderCell(event.point);
  } else if (event.type === 'relax') {
    open.add(pointKey(event.point));
    scoreByKey.set(pointKey(event.point), { g: event.g, h: event.h, f: event.f, parent: event.parent });
    $('pseudo-2').classList.add('step-current');
    $('pseudo-3').classList.add('step-current');
    renderCell(event.point);
  } else if (event.type === 'close') {
    open.delete(pointKey(event.point));
    closed.add(pointKey(event.point));
    expandedCount++;
    renderCell(event.point);
  } else if (event.type === 'found') {
    path = new Set(event.path.map(pointKey));
    pathLength = event.cost;
    $('pseudo-4').classList.add('step-current');
    for (const point of event.path) renderCell(point);
  } else {
    setAnnouncement('没有可达路径');
  }
}

function finishSearch(result: SearchResult): void {
  status = result.status;
  expandedCount = result.expanded;
  if (result.status === 'success') {
    pathLength = result.cost;
    path = new Set(result.path.map(pointKey));
    setAnnouncement('找到最短路径');
  } else {
    pathLength = null;
    setAnnouncement('没有可达路径');
  }
  renderAllCells();
  renderControls();
}

function nextExpansion(): SearchStep | undefined {
  if (!generator) return undefined;
  const began = performance.now();
  const step = generator.next();
  computeMs += performance.now() - began;
  if (step.done) return { events: [{ type: 'no-path' }], done: true, result: { status: 'no-path', path: [], cost: Infinity, expanded: expandedCount } };
  return step.value;
}

function processFrame(timestamp: number, activeRun: number): void {
  if (activeRun !== runId || status !== 'running') return;
  const delta = lastFrame === 0 ? 16 : Math.min(timestamp - lastFrame, 100);
  lastFrame = timestamp;
  const speed = Number(($('speed') as HTMLInputElement).value);
  budget += (delta * speed) / 1000;
  let count = Math.floor(budget);
  budget -= count;
  while (count > 0 && status === 'running') {
    if (eventQueue.length === 0) {
      if (queuedResult) {
        finishSearch(queuedResult);
        queuedResult = undefined;
        break;
      }
      const step = nextExpansion();
      if (!step) break;
      eventQueue = [...step.events];
      if (step.done) queuedResult = step.result;
    }
    const event = eventQueue.shift();
    if (event) applyEvent(event);
    count--;
  }
  renderControls();
  if (status === 'running') frameId = requestAnimationFrame((next) => processFrame(next, activeRun));
}

function startPlayback(): void {
  if (status === 'running') {
    status = 'paused';
    cancelAnimationFrame(frameId);
    frameId = 0;
    setAnnouncement('搜索已暂停');
    renderControls();
    return;
  }
  if (status === 'paused' && generator) {
    status = 'running';
    lastFrame = 0;
    const activeRun = runId;
    frameId = requestAnimationFrame((timestamp) => processFrame(timestamp, activeRun));
    renderControls();
    return;
  }
  createSearch();
  status = 'running';
  lastFrame = 0;
  const activeRun = runId;
  frameId = requestAnimationFrame((timestamp) => processFrame(timestamp, activeRun));
  renderControls();
}

function singleStep(): void {
  if (!generator) createSearch();
  if (eventQueue.length === 0) {
    const step = nextExpansion();
    if (!step) return;
    eventQueue = [...step.events];
    queuedResult = step.done ? step.result : undefined;
  }
  for (const event of eventQueue) applyEvent(event);
  eventQueue = [];
  if (queuedResult) {
    finishSearch(queuedResult);
    queuedResult = undefined;
    return;
  }
  status = 'paused';
  setAnnouncement('搜索已暂停');
  renderControls();
}

function activateCell(point: Point): void {
  focused = point;
  if (!canEdit()) {
    renderCell(point);
    renderInspector(point);
    return;
  }
  const key = pointKey(point);
  if (mode === 'start') {
    if (walls.has(key) || key === pointKey(goal)) {
      showToast(walls.has(key) ? '起点必须设置在通路格上' : '起点不能与终点重叠');
      return;
    }
    clearSearch(false);
    start = point;
    focused = point;
    renderAllCells();
    renderInspector(start);
    setAnnouncement('起点已更新');
    renderControls();
    return;
  }
  editWall(point, mode === 'wall');
}

function editWall(point: Point, makeWall: boolean): void {
  if (!canEdit()) return;
  const key = pointKey(point);
  if (key === pointKey(start) || key === pointKey(goal)) return;
  if (walls.has(key) === makeWall) return;
  clearSearch(false);
  if (makeWall) walls.add(key);
  else walls.delete(key);
  renderCell(point);
  renderControls();
}

function pointFromTarget(target: EventTarget | null): Point | null {
  const cell = (target as Element | null)?.closest<SVGGElement>('[data-key]');
  return cell ? { row: Number(cell.dataset.row), col: Number(cell.dataset.col) } : null;
}

function generateNewMaze(): void {
  if (!canEdit()) return;
  clearSearch(false);
  status = 'generating';
  renderControls();
  try {
    const result = generateMaze(rows, cols, start, nextSeed++, Number(($('loop-count') as HTMLInputElement).value));
    walls = result.walls;
    if (!result.goal) {
      status = 'idle';
      setAnnouncement('没有可用终点');
      showToast('当前地图没有可用终点，请重新生成');
    } else {
      goal = result.goal;
      setAnnouncement('迷宫已生成');
    }
    buildGrid();
  } catch {
    status = 'idle';
    setAnnouncement('迷宫生成失败');
    showToast('无法生成该尺寸的迷宫');
  }
  renderControls();
}

function randomizeGoal(): void {
  if (!canEdit()) return;
  clearSearch(false);
  const random = Math.random;
  const nextGoal = chooseReachableGoal(walls, rows, cols, start, random);
  if (!nextGoal) {
    setAnnouncement('没有可用终点');
    renderControls();
    showToast('起点所在连通区域没有其他通路格');
    return;
  }
  goal = nextGoal;
  setAnnouncement('终点已更新');
  renderAllCells();
  renderControls();
}

function changeSize(value: keyof typeof presets): void {
  if (!canEdit()) return;
  [rows, cols] = presets[value];
  start = { row: 1, col: 1 };
  focused = { ...start };
  const result = generateMaze(rows, cols, start, nextSeed++, Number(($('loop-count') as HTMLInputElement).value));
  walls = result.walls;
  goal = result.goal ?? { row: rows - 2, col: cols - 2 };
  clearSearch(false);
  setAnnouncement('尺寸已更改，旧地图已替换');
  buildGrid();
  renderControls();
  showToast('网格尺寸已更改，地图已重新生成');
}

$('tool-start').addEventListener('click', () => { mode = 'start'; $('tool-hint').textContent = '点击通路格设置起点；墙壁和终点不可选'; renderControls(); });
$('tool-wall').addEventListener('click', () => { mode = 'wall'; $('tool-hint').textContent = '拖动绘制墙壁；起点和终点不会被覆盖'; renderControls(); });
$('tool-erase').addEventListener('click', () => { mode = 'erase'; $('tool-hint').textContent = '拖动擦除墙壁；起点和终点不会被覆盖'; renderControls(); });
$('run-button').addEventListener('click', startPlayback);
$('step-button').addEventListener('click', singleStep);
$('reset-button').addEventListener('click', () => { clearSearch(); setAnnouncement('搜索已清除，可重新运行'); renderControls(); });
$('clear-search').addEventListener('click', () => { clearSearch(); setAnnouncement('搜索状态已清除'); renderControls(); });
$('clear-walls').addEventListener('click', () => { clearSearch(false); walls.clear(); renderAllCells(); setAnnouncement('墙壁已清空'); renderControls(); });
$('maze-button').addEventListener('click', generateNewMaze);
$('goal-button').addEventListener('click', randomizeGoal);
$('size-select').addEventListener('change', (event) => changeSize((event.currentTarget as HTMLSelectElement).value as keyof typeof presets));
$('speed').addEventListener('input', () => { $('speed-value').textContent = ($('speed') as HTMLInputElement).value; });
$('loop-count').addEventListener('input', () => { $('loop-value').textContent = ($('loop-count') as HTMLInputElement).value; });
$('grid').addEventListener('click', (event) => {
  const point = pointFromTarget(event.target);
  if (point && mode === 'start') activateCell(point);
  else if (point) { focused = point; renderCell(point); renderInspector(point); }
});
$('grid').addEventListener('pointerdown', (event) => {
  if (mode === 'start' || !canEdit()) return;
  const point = pointFromTarget(event.target);
  if (!point) return;
  event.preventDefault();
  drawing = true;
  ($('grid') as unknown as SVGSVGElement).setPointerCapture(event.pointerId);
  editWall(point, mode === 'wall');
});
$('grid').addEventListener('pointermove', (event) => {
  if (!drawing) return;
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const point = pointFromTarget(element);
  if (point) editWall(point, mode === 'wall');
});
window.addEventListener('pointerup', () => { drawing = false; });
$('grid').addEventListener('keydown', (event) => {
  const delta = event.key === 'ArrowUp' ? { row: -1, col: 0 } : event.key === 'ArrowRight' ? { row: 0, col: 1 } : event.key === 'ArrowDown' ? { row: 1, col: 0 } : event.key === 'ArrowLeft' ? { row: 0, col: -1 } : null;
  if (delta) {
    event.preventDefault();
    const previous = { ...focused };
    focused = { row: Math.max(0, Math.min(rows - 1, focused.row + delta.row)), col: Math.max(0, Math.min(cols - 1, focused.col + delta.col)) };
    renderCell(previous);
    renderCell(focused);
    const active = cellElements(pointKey(focused))?.group;
    $('grid').setAttribute('aria-activedescendant', `cell-${focused.row}-${focused.col}`);
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    renderInspector(focused);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activateCell(focused);
  }
});

function initialize(): void {
  const result = generateMaze(rows, cols, start, 17, 10);
  walls = result.walls;
  goal = result.goal ?? goal;
  buildGrid();
  renderControls();
}

initialize();