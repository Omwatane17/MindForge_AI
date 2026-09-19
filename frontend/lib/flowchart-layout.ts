// lib/flowchart-layout.ts
// Shared hierarchical layout engine used by both the mindmap page SVG renderer
// and the PDF export module. Extracted so both consumers get identical positioning.

export interface FlowchartNode {
  id: string;
  label: string;
  type: string;
  priority: number;
  status: string;
}

export interface FlowchartEdge {
  source: string;
  target: string;
  label?: string;
}

export interface LayoutNode extends FlowchartNode {
  x: number;      // centre x
  y: number;      // top y
  width: number;
  height: number;
  level: number;
}

export interface LayoutResult {
  layoutNodes: LayoutNode[];
  canvasWidth: number;
  canvasHeight: number;
}

const NODE_W = 200;
const NODE_H_BASE = 64;
const H_GAP = 48;
const V_GAP = 80;

export function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? current + ' ' + w : w;
    if (candidate.length > maxChars) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

export function nodeHeight(label: string, isRoot: boolean): number {
  const lines = wrapText(label, isRoot ? 22 : 24).length;
  return Math.max(NODE_H_BASE, lines * 22 + 28);
}

export function buildFlowchartLayout(
  nodes: FlowchartNode[],
  edges: FlowchartEdge[],
): LayoutResult {
  if (!nodes.length) return { layoutNodes: [], canvasWidth: 800, canvasHeight: 480 };

  // Build parent→children adjacency
  const childrenMap: Record<string, string[]> = {};
  for (const n of nodes) childrenMap[n.id] = [];
  for (const e of edges) {
    if (childrenMap[e.source] !== undefined) childrenMap[e.source].push(e.target);
  }

  // Find root
  const hasIncoming = new Set(edges.map(e => e.target));
  const goalNode = nodes.find(n => n.type === 'goal');
  const rootId = goalNode?.id ?? nodes.find(n => !hasIncoming.has(n.id))?.id ?? nodes[0]?.id;

  // BFS level assignment
  const levelMap: Record<string, number> = {};
  const bfsQueue = [rootId];
  levelMap[rootId] = 0;
  while (bfsQueue.length) {
    const id = bfsQueue.shift()!;
    for (const child of (childrenMap[id] ?? [])) {
      if (levelMap[child] === undefined) {
        levelMap[child] = (levelMap[id] ?? 0) + 1;
        bfsQueue.push(child);
      }
    }
  }
  for (const n of nodes) {
    if (levelMap[n.id] === undefined) levelMap[n.id] = 0;
  }

  // Group by level
  const levels: Record<number, string[]> = {};
  for (const n of nodes) {
    const lv = levelMap[n.id] ?? 0;
    if (!levels[lv]) levels[lv] = [];
    levels[lv].push(n.id);
  }
  const numLevels = Math.max(...Object.keys(levels).map(Number)) + 1;
  const nodeById: Record<string, FlowchartNode> = {};
  for (const n of nodes) nodeById[n.id] = n;

  // Subtree width calculation
  const subtreeWidth: Record<string, number> = {};
  function calcSubtreeWidth(id: string): number {
    const children = childrenMap[id] ?? [];
    if (!children.length) { subtreeWidth[id] = NODE_W; return NODE_W; }
    const total = children.reduce((sum, c) => sum + calcSubtreeWidth(c) + H_GAP, -H_GAP);
    subtreeWidth[id] = Math.max(NODE_W, total);
    return subtreeWidth[id];
  }
  calcSubtreeWidth(rootId);

  // X position assignment
  const xPos: Record<string, number> = {};
  function assignX(id: string, left: number) {
    const children = childrenMap[id] ?? [];
    const sw = subtreeWidth[id] ?? NODE_W;
    xPos[id] = left + sw / 2;
    if (!children.length) return;
    let childLeft = left;
    for (const c of children) {
      assignX(c, childLeft);
      childLeft += (subtreeWidth[c] ?? NODE_W) + H_GAP;
    }
  }
  assignX(rootId, 0);

  // Y positions per level
  const levelY: number[] = [];
  let y = 60;
  for (let lv = 0; lv < numLevels; lv++) {
    levelY[lv] = y;
    const maxH = Math.max(...(levels[lv] ?? []).map(id =>
      nodeHeight((nodeById[id]?.label ?? ''), lv === 0)
    ));
    y += maxH + V_GAP;
  }

  const totalHeight = y + 20;
  const allXVals = Object.values(xPos);
  const minX = Math.min(...allXVals);
  const maxX = Math.max(...allXVals);
  const totalWidth = Math.max(maxX - minX + NODE_W + 80, 900);
  const offsetX = (totalWidth - (maxX - minX + NODE_W)) / 2 - minX + NODE_W / 2;

  const layoutNodes: LayoutNode[] = nodes.map(n => {
    const lv = levelMap[n.id] ?? 0;
    const isRoot = lv === 0;
    const h = nodeHeight(n.label, isRoot);
    const w = isRoot ? 240 : NODE_W;
    return {
      ...n,
      x: (xPos[n.id] ?? 0) + offsetX,
      y: levelY[lv] ?? 60,
      width: w,
      height: h,
      level: lv,
    };
  });

  return { layoutNodes, canvasWidth: totalWidth, canvasHeight: totalHeight };
}
