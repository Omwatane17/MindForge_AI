'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import ExportPdfButton from '@/components/ExportPdfButton';
import Link from 'next/link';
import { getPriorityColor } from '@/lib/utils';

interface MindMapNode {
  id: string;
  label: string;
  type: 'goal' | 'task' | 'subtask';
  priority: number;
  status: string;
}

interface MindMapEdge {
  source: string;
  target: string;
  label?: string;
}

interface LayoutNode extends MindMapNode {
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
}

const NODE_W = 200;
const NODE_H_BASE = 64;
const H_GAP = 48;
const V_GAP = 80;

function wrapText(text: string, maxChars: number): string[] {
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

function nodeHeight(label: string, isRoot: boolean): number {
  const lines = wrapText(label, isRoot ? 22 : 24).length;
  return Math.max(NODE_H_BASE, lines * 22 + 28);
}

function buildLayout(nodes: MindMapNode[], edges: MindMapEdge[]) {
  if (!nodes.length) return { layoutNodes: [] as LayoutNode[], canvasWidth: 800, canvasHeight: 480 };

  const childrenMap: Record<string, string[]> = {};
  for (const n of nodes) childrenMap[n.id] = [];
  for (const e of edges) {
    if (childrenMap[e.source] !== undefined) childrenMap[e.source].push(e.target);
  }

  const hasIncoming = new Set(edges.map(e => e.target));
  const goalNode = nodes.find(n => n.type === 'goal');
  const rootId = goalNode?.id ?? nodes.find(n => !hasIncoming.has(n.id))?.id ?? nodes[0]?.id;

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

  const levels: Record<number, string[]> = {};
  for (const n of nodes) {
    const lv = levelMap[n.id] ?? 0;
    if (!levels[lv]) levels[lv] = [];
    levels[lv].push(n.id);
  }
  const numLevels = Math.max(...Object.keys(levels).map(Number)) + 1;
  const nodeById: Record<string, MindMapNode> = {};
  for (const n of nodes) nodeById[n.id] = n;

  const subtreeWidth: Record<string, number> = {};
  function calcSubtreeWidth(id: string): number {
    const children = childrenMap[id] ?? [];
    if (!children.length) { subtreeWidth[id] = NODE_W; return NODE_W; }
    const total = children.reduce((sum, c) => sum + calcSubtreeWidth(c) + H_GAP, -H_GAP);
    subtreeWidth[id] = Math.max(NODE_W, total);
    return subtreeWidth[id];
  }
  calcSubtreeWidth(rootId);

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

  const levelY: number[] = [];
  let y = 60;
  for (let lv = 0; lv < numLevels; lv++) {
    levelY[lv] = y;
    const maxH = Math.max(...(levels[lv] ?? []).map(id => nodeHeight((nodeById[id]?.label ?? ''), lv === 0)));
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
    return { ...n, x: (xPos[n.id] ?? 0) + offsetX, y: levelY[lv] ?? 60, width: w, height: h, level: lv };
  });

  return { layoutNodes, canvasWidth: totalWidth, canvasHeight: totalHeight };
}

function edgePath(from: LayoutNode, to: LayoutNode): string {
  const x1 = from.x;
  const y1 = from.y + from.height;
  const x2 = to.x;
  const y2 = to.y;
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

function getNodeVisuals(node: MindMapNode, level: number) {
  if (level === 0) return { bg: 'rgba(59,130,246,0.15)', border: '#3B82F6', text: '#E0EDFF', accent: '#3B82F6', glow: '0 0 24px rgba(59,130,246,0.4)' };
  if (node.status === 'completed') return { bg: 'rgba(16,185,129,0.12)', border: '#10B981', text: '#A7F3D0', accent: '#10B981', glow: 'none' };
  if (node.status === 'in_progress') return { bg: 'rgba(245,158,11,0.12)', border: '#F59E0B', text: '#FDE68A', accent: '#F59E0B', glow: 'none' };
  const color = getPriorityColor(node.priority ?? 50);
  return { bg: `${color}18`, border: level === 1 ? color : `${color}99`, text: '#E2E8F0', accent: color, glow: 'none' };
}

function FlowchartSVG({ nodes, edges, selectedNode, onSelectNode }: {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  selectedNode: MindMapNode | null;
  onSelectNode: (n: MindMapNode | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const { layoutNodes, canvasWidth, canvasHeight } = buildLayout(nodes, edges);
  const nodeById: Record<string, LayoutNode> = {};
  for (const n of layoutNodes) nodeById[n.id] = n;

  const fitView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const s = Math.min(Math.min(width / canvasWidth, height / canvasHeight) * 0.92, 1);
    setScale(s);
    setPan({ x: 0, y: 0 });
  }, [canvasWidth, canvasHeight]);

  useEffect(() => { fitView(); }, [fitView]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setPan({ x: panStart.current.px + (e.clientX - panStart.current.mx) / scale, y: panStart.current.py + (e.clientY - panStart.current.my) / scale });
  };
  const onMouseUp = () => { isPanning.current = false; };

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setScale(s => Math.max(0.25, Math.min(2.5, s * (e.deltaY < 0 ? 1.1 : 0.9))));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  return (
    <div ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', cursor: 'grab', userSelect: 'none' }}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
    >
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10 }}>
        {[
          { label: '+', fn: () => setScale(s => Math.min(2.5, s * 1.15)), title: 'Zoom in' },
          { label: '−', fn: () => setScale(s => Math.max(0.25, s * 0.87)), title: 'Zoom out' },
          { label: '⊡', fn: fitView, title: 'Fit view' },
        ].map(b => (
          <button key={b.label} onClick={e => { e.stopPropagation(); b.fn(); }} title={b.title}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(17,24,39,0.9)', border: '1px solid rgba(148,163,184,0.2)', color: '#94A3B8', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {b.label}
          </button>
        ))}
      </div>

      <svg
        width={canvasWidth * scale}
        height={canvasHeight * scale}
        viewBox={`${-pan.x} ${-pan.y} ${canvasWidth} ${canvasHeight}`}
        style={{ display: 'block' }}
      >
        <defs>
          <marker id="arr" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(148,163,184,0.45)" />
          </marker>
          <marker id="arr-blue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(59,130,246,0.8)" />
          </marker>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148,163,184,0.04)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={canvasWidth} height={canvasHeight} fill="url(#grid)" />

        {edges.map((edge, i) => {
          const from = nodeById[edge.source];
          const to = nodeById[edge.target];
          if (!from || !to) return null;
          const isHighlighted = selectedNode?.id === from.id || selectedNode?.id === to.id;
          const isFromRoot = from.level === 0;
          return (
            <path key={i} d={edgePath(from, to)} fill="none"
              stroke={isHighlighted ? 'rgba(59,130,246,0.75)' : isFromRoot ? 'rgba(59,130,246,0.38)' : 'rgba(148,163,184,0.22)'}
              strokeWidth={isHighlighted ? 2 : 1.5}
              markerEnd={isHighlighted || isFromRoot ? 'url(#arr-blue)' : 'url(#arr)'}
            />
          );
        })}

        {layoutNodes.map(node => {
          const v = getNodeVisuals(node, node.level);
          const isSelected = selectedNode?.id === node.id;
          const isRoot = node.level === 0;
          const maxChars = isRoot ? 22 : 24;
          const lines = wrapText(node.label, maxChars);
          const lineH = isRoot ? 20 : 18;
          const textY = node.y + (node.height - lines.length * lineH) / 2 + lineH * 0.8;
          const rx = isRoot ? 14 : 10;

          return (
            <g key={node.id} onClick={e => { e.stopPropagation(); onSelectNode(isSelected ? null : node); }} style={{ cursor: 'pointer' }}>
              {isSelected && (
                <rect x={node.x - node.width / 2 - 4} y={node.y - 4} width={node.width + 8} height={node.height + 8}
                  rx={rx + 4} fill="none" stroke={v.accent} strokeWidth={2} opacity={0.55} />
              )}
              <rect x={node.x - node.width / 2} y={node.y} width={node.width} height={node.height}
                rx={rx} fill={v.bg}
                stroke={isSelected ? v.border : (isRoot ? v.border : `${v.border}AA`)}
                strokeWidth={isRoot ? 2 : 1.5}
                style={{ filter: isRoot ? v.glow : undefined }}
              />
              {!isRoot && (
                <rect x={node.x - node.width / 2} y={node.y + rx} width={3} height={node.height - rx * 2}
                  rx={1.5} fill={v.accent} opacity={0.8} />
              )}
              {isRoot && (
                <>
                  <rect x={node.x - 28} y={node.y - 13} width={56} height={18} rx={9}
                    fill="rgba(59,130,246,0.28)" stroke="rgba(59,130,246,0.55)" strokeWidth={1} />
                  <text x={node.x} y={node.y - 4} textAnchor="middle" fill="#93C5FD"
                    fontSize={9} fontWeight={700} style={{ pointerEvents: 'none' }}>
                    MAIN GOAL
                  </text>
                </>
              )}
              {!isRoot && (
                <circle cx={node.x + node.width / 2 - 12} cy={node.y + 12} r={4}
                  fill={node.status === 'completed' ? '#10B981' : node.status === 'in_progress' ? '#F59E0B' : '#475569'} />
              )}
              {lines.map((line, li) => (
                <text key={li}
                  x={isRoot ? node.x : node.x - node.width / 2 + 18}
                  y={textY + li * lineH}
                  textAnchor={isRoot ? 'middle' : 'start'}
                  fill={v.text}
                  fontSize={isRoot ? 15 : node.level === 1 ? 13 : 12}
                  fontWeight={isRoot ? 800 : node.level === 1 ? 700 : 600}
                  style={{ pointerEvents: 'none', fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  {line}
                </text>
              ))}
              {!isRoot && node.priority >= 65 && (
                <>
                  <rect x={node.x + node.width / 2 - 44} y={node.y + node.height - 18}
                    width={40} height={13} rx={4}
                    fill={`${v.accent}22`} stroke={`${v.accent}55`} strokeWidth={0.8} />
                  <text x={node.x + node.width / 2 - 24} y={node.y + node.height - 8}
                    textAnchor="middle" fill={v.accent} fontSize={8} fontWeight={700}
                    style={{ pointerEvents: 'none' }}>
                    {node.priority >= 85 ? '● CRITICAL' : '● HIGH'}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MindMapContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [mindMapData, setMindMapData] = useState<{ nodes: MindMapNode[]; edges: MindMapEdge[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const requestedId = searchParams?.get('projectId');
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => {
        setProjects(data);
        if (data.length > 0) {
          const found = requestedId ? data.find((p: any) => p.id === requestedId) : null;
          setSelectedProject(found || data[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status, searchParams]);

  useEffect(() => {
    if (!selectedProject) return;
    setMindMapData(null); setError(null);
    fetch(`/api/mindmap?projectId=${selectedProject.id}`)
      .then(r => r.json())
      .then(data => { if (data.nodes) setMindMapData(data); else setError('Could not load workflow data.'); })
      .catch(() => setError('Failed to load workflow map.'));
  }, [selectedProject]);

  const regenerate = async () => {
    if (!selectedProject) return;
    setRegenerating(true); setMindMapData(null); setError(null); setSelectedNode(null);
    try {
      await fetch('/api/mindmap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: selectedProject.id }) });
      const res = await fetch(`/api/mindmap?projectId=${selectedProject.id}`);
      if (res.ok) setMindMapData(await res.json());
      else setError('Failed to regenerate workflow map.');
    } catch { setError('Network error during regeneration.'); }
    finally { setRegenerating(false); }
  };

  return (
    <AppLayout>
      <div className="page">
        <div className="page-header flex items-center justify-between flex-wrap gap-16">
          <div>
            <h1 className="page-title">🗺️ Workflow Map</h1>
            <p className="page-subtitle">Hierarchical flowchart of your goal and task relationships</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {selectedProject && (
              <ExportPdfButton
                project={selectedProject}
                projectId={selectedProject.id}
                mindMap={mindMapData}
                label="Export PDF"
              />
            )}
            <button onClick={regenerate} disabled={regenerating} className="btn btn-ghost btn-sm" id="regenerate-mindmap-btn">
              {regenerating ? '⏳ Regenerating...' : '🔄 Regenerate'}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="loading-spinner" /></div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗺️</div>
            <div className="empty-state-title">No projects yet</div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Create a project first to generate a workflow map.</p>
            <Link href="/dashboard" className="btn btn-primary mt-16">Create a Project</Link>
          </div>
        ) : (
          <>
            {projects.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {projects.map((p: any) => (
                  <button key={p.id} onClick={() => { setSelectedProject(p); setSelectedNode(null); }}
                    className={`btn btn-sm ${selectedProject?.id === p.id ? 'btn-primary' : 'btn-ghost'}`}>
                    {p.title.slice(0, 25)}
                  </button>
                ))}
              </div>
            )}

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, height: '60vh', minHeight: 400, maxHeight: 640, position: 'relative', overflow: 'hidden' }}>
              {error ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: '2rem' }}>⚠️</div>
                  <div style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</div>
                  <button onClick={regenerate} className="btn btn-ghost btn-sm">Try Again</button>
                </div>
              ) : !mindMapData ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
                  <div className="loading-spinner" style={{ width: 32, height: 32 }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Building workflow diagram…</span>
                </div>
              ) : (
                <FlowchartSVG nodes={mindMapData.nodes} edges={mindMapData.edges} selectedNode={selectedNode} onSelectNode={setSelectedNode} />
              )}
            </div>

            {selectedNode && (
              <div className="card mt-16" style={{ animation: 'fade-in 0.2s ease' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: selectedNode.type === 'goal' ? 'rgba(59,130,246,0.15)' : `${getPriorityColor(selectedNode.priority ?? 50)}18`, border: `1.5px solid ${selectedNode.type === 'goal' ? '#3B82F6' : getPriorityColor(selectedNode.priority ?? 50)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                    {selectedNode.type === 'goal' ? '🎯' : selectedNode.status === 'completed' ? '✅' : selectedNode.status === 'in_progress' ? '⚡' : '📌'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6, color: 'var(--text-primary)' }}>{selectedNode.label}</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: '0.8rem' }}>
                      <span style={{ padding: '2px 10px', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text-secondary)' }}>Type: {selectedNode.type}</span>
                      <span style={{ padding: '2px 10px', background: `${getPriorityColor(selectedNode.priority ?? 50)}18`, border: `1px solid ${getPriorityColor(selectedNode.priority ?? 50)}40`, borderRadius: 20, color: getPriorityColor(selectedNode.priority ?? 50) }}>Priority: {selectedNode.priority ?? 0}/100</span>
                      {selectedNode.status && (
                        <span style={{ padding: '2px 10px', background: selectedNode.status === 'completed' ? 'rgba(16,185,129,0.12)' : selectedNode.status === 'in_progress' ? 'rgba(245,158,11,0.12)' : 'rgba(71,85,105,0.2)', border: `1px solid ${selectedNode.status === 'completed' ? '#10B98140' : selectedNode.status === 'in_progress' ? '#F59E0B40' : '#47556940'}`, borderRadius: 20, color: selectedNode.status === 'completed' ? '#10B981' : selectedNode.status === 'in_progress' ? '#F59E0B' : 'var(--text-muted)' }}>
                          {selectedNode.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>✕</button>
                </div>
              </div>
            )}

            <div className="card mt-16">
              <div className="card-title mb-12">Legend</div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                  { color: '#3B82F6', label: 'Root Goal' },
                  { color: '#EF4444', label: 'Critical task' },
                  { color: '#F59E0B', label: 'High / In progress' },
                  { color: '#10B981', label: 'Completed' },
                  { color: '#6B7280', label: 'Normal priority' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 14, borderRadius: 4, background: `${item.color}20`, border: `1.5px solid ${item.color}` }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</span>
                  </div>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  🖱️ Scroll to zoom &nbsp;·&nbsp; Drag to pan &nbsp;·&nbsp; Click node for details
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default function MindMapPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="loading-spinner" /></div>}>
      <MindMapContent />
    </Suspense>
  );
}
