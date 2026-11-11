# A* 寻路实验室

一个基于原生 TypeScript、SVG 与 Vite 的中文交互式 A* 学习演示。地图、算法和动画均在浏览器本地运行，不需要账号、后端或私人密钥。

## 功能

- 15 × 21、21 × 31、31 × 41 三档四方向网格。
- 设置起点、拖动绘制/擦除墙壁、清空墙壁、清除搜索。
- 带环路的随机 DFS 迷宫、可复现种子算法和可达区域内的随机终点。
- A* 搜索动画，支持暂停、继续、单步和速度调整。
- 展示当前节点的 g、h、f、父节点、路径长度、扩展节点数和纯算法计算时间。
- 键盘方向键浏览网格，Enter 使用当前工具；支持减弱动态效果偏好。

算法采用曼哈顿距离、四邻接、单位代价，以及 f、h、入队顺序的稳定优先规则。路径长度按边数计数；终点不会在首次发现时提前结束搜索。

## 本地运行

需要 Node.js 24 LTS（版本见 `.nvmrc`）和 npm。

```sh
npm ci
npm run dev
```

## 检查

```sh
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run preview
```

单元测试覆盖 A* 最短路径、无路、非法输入、200 张随机障碍图与 BFS 差分，以及 100 个迷宫种子的连通和终点规则。Playwright 覆盖网格、单步/暂停/继续、墙壁编辑和尺寸切换；本地首次运行前需执行 `npx playwright install chromium firefox webkit`。

## 发布到 GitHub Pages

将此项目推送到 GitHub 仓库的 `main` 分支，并在仓库 Settings → Pages 中将 Source 设为 GitHub Actions。工作流会执行类型检查、单元测试和生产构建，再发布 `dist/`。Vite 会根据 `GITHUB_REPOSITORY` 自动使用仓库子路径；`*.github.io` 主页仓库使用根路径。

## 项目结构

```text
src/core/       A*、最小堆、迷宫和随机数
src/main.ts     网格交互、渲染和播放控制
src/styles.css  响应式界面
tests/unit/     算法与地图单元测试
```