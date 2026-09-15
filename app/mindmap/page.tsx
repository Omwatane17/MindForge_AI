'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { getPriorityColor } from '@/lib/utils';

function MindMapContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [mindMapData, setMindMapData] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/projects').then(r => r.json()).then(data => {
      setProjects(data);
      if (data.length > 0) setSelectedProject(data[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    if (!selectedProject) return;
    setMindMapData(null);
    fetch(`/api/mindmap?projectId=${selectedProject.id}`).then(r => r.json()).then(data => {
      if (data.nodes) setMindMapData(data);
    }).catch(() => {});
  }, [selectedProject]);

  const regenerate = async () => {
    if (!selectedProject) return;
    setMindMapData(null);
    await fetch('/api/mindmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: selectedProject.id }),
    });
    const res = await fetch(`/api/mindmap?projectId=${selectedProject.id}`);
    if (res.ok) setMindMapData(await res.json());
  };

  // Layout calculation for mind map
  const renderMindMap = () => {
    if (!mindMapData) return null;
    const { nodes, edges } = mindMapData;
    const width = 800;
    const height = 480;
    const cx = width / 2;
    const cy = height / 2;

    const goalNode = nodes.find(n => n.type === 'goal');
    const taskNodes = nodes.filter(n => n.type !== 'goal');
    
    // Position task nodes in a circle around goal
    const radius = 160;
    const positions: Record<string, { x: number; y: number }> = {};
    
    if (goalNode) {
      positions[goalNode.id] = { x: cx, y: cy };
    }
    
    taskNodes.forEach((node, i) => {
      const angle = (i / taskNodes.length) * 2 * Math.PI - Math.PI / 2;
      positions[node.id] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });

    const getNodeColor = (node: any) => {
      if (node.type === 'goal') return '#3B82F6';
      if (node.status === 'completed') return '#10B981';
      if (node.status === 'in_progress') return '#F59E0B';
      return getPriorityColor(node.priority || 50);
    };

    return (
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
        {/* Edges */}
        {edges.map((edge, i) => {
          const from = positions[edge.source];
          const to = positions[edge.target];
          if (!from || !to) return null;
          return (
            <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="rgba(148,163,184,0.2)" strokeWidth={1.5} strokeDasharray="4 3" />
          );
        })}
        
        {/* Nodes */}
        {nodes.map((node) => {
          const pos = positions[node.id];
          if (!pos) return null;
          const isGoal = node.type === 'goal';
          const r = isGoal ? 40 : 28;
          const color = getNodeColor(node);
          const isSelected = selectedNode?.id === node.id;

          return (
            <g key={node.id} className="mindmap-node"
              onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
              style={{ cursor: 'pointer' }}>
              {isSelected && (
                <circle cx={pos.x} cy={pos.y} r={r + 6} fill="none"
                  stroke={color} strokeWidth={2} opacity={0.5} />
              )}
              <circle cx={pos.x} cy={pos.y} r={r}
                fill={`${color}22`} stroke={color} strokeWidth={isGoal ? 2.5 : 2}
                style={{ filter: isGoal ? `drop-shadow(0 0 10px ${color}60)` : undefined }}
              />
              <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
                fill={color} fontSize={isGoal ? 14 : 10} fontWeight={isGoal ? 800 : 600}
                style={{ pointerEvents: 'none' }}>
                {node.label.slice(0, isGoal ? 12 : 10)}
              </text>
              {node.label.length > (isGoal ? 12 : 10) && (
                <text x={pos.x} y={pos.y + (isGoal ? 16 : 12)} textAnchor="middle"
                  fill={color} fontSize={isGoal ? 14 : 10} fontWeight={isGoal ? 800 : 600}
                  style={{ pointerEvents: 'none', opacity: 0.85 }}>
                  {node.label.slice(isGoal ? 12 : 10, isGoal ? 24 : 20)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <AppLayout>
      <div className="page">
        <div className="page-header flex items-center justify-between flex-wrap gap-16">
          <div>
            <h1 className="page-title">🗺️ Mind Map</h1>
            <p className="page-subtitle">Visual representation of your goal and task relationships</p>
          </div>
          <button onClick={regenerate} className="btn btn-ghost btn-sm" id="regenerate-mindmap-btn">
            🔄 Regenerate
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="loading-spinner" /></div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗺️</div>
            <div className="empty-state-title">No projects yet</div>
            <a href="/dashboard" className="btn btn-primary mt-16">Create a Project</a>
          </div>
        ) : (
          <>
            {projects.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {projects.map((p: any) => (
                  <button key={p.id} onClick={() => setSelectedProject(p)}
                    className={`btn btn-sm ${selectedProject?.id === p.id ? 'btn-primary' : 'btn-ghost'}`}>
                    {p.title.slice(0, 25)}
                  </button>
                ))}
              </div>
            )}

            <div className="mindmap-container">
              {!mindMapData ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
                  <div className="loading-spinner" style={{ width: 32, height: 32 }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Generating mind map...</span>
                </div>
              ) : renderMindMap()}
            </div>

            {/* Selected node detail */}
            {selectedNode && (
              <div className="card mt-16 animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: selectedNode.type === 'goal' ? 'var(--brand-blue)' : getPriorityColor(selectedNode.priority || 50) }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{selectedNode.label}</div>
                    <div style={{ display: 'flex', gap: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>Type: {selectedNode.type}</span>
                      <span>Priority: {selectedNode.priority}/100</span>
                      <span>Status: {selectedNode.status || 'N/A'}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="btn btn-ghost btn-sm">✕</button>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="card mt-16">
              <div className="card-title mb-12">Legend</div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[
                  { color: '#3B82F6', label: 'Goal (center)' },
                  { color: '#EF4444', label: 'High priority' },
                  { color: '#F59E0B', label: 'Medium / In progress' },
                  { color: '#10B981', label: 'Completed' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default function MindMapPage() {
  return <Suspense fallback={<div>Loading...</div>}><MindMapContent /></Suspense>;
}
