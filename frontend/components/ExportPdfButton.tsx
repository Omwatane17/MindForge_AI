'use client';

import React, { useState } from 'react';
import type { PdfExportData } from '@/lib/pdf-export';

interface ExportPdfButtonProps {
  project?: any;
  projectId?: string;
  tasks?: any[];
  dependencies?: any[];
  mindMap?: any;
  risk?: any;
  userInput?: string;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md';
  label?: string;
}

export default function ExportPdfButton({
  project,
  projectId,
  tasks,
  dependencies,
  mindMap,
  risk,
  userInput,
  className = '',
  style,
  variant = 'secondary',
  size = 'sm',
  label = 'Export PDF',
}: ExportPdfButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (exporting) return;

    setExporting(true);
    setError(null);
    setSuccess(false);

    try {
      const activeProjId = project?.id || projectId;

      let exportProject = project;
      let exportTasks = tasks;
      let exportDeps = dependencies;
      let exportMindMap = mindMap;
      let exportRisk = risk;

      // If key data is missing and we have a project ID, fetch the complete detail from the API
      if (activeProjId && (!exportTasks || !exportMindMap || !exportRisk)) {
        try {
          const res = await fetch(`/api/projects/${activeProjId}`);
          if (res.ok) {
            const data = await res.json();
            exportProject = exportProject || data.project;
            exportTasks = exportTasks || data.tasks || [];
            exportDeps = exportDeps || data.dependencies || [];
            exportMindMap = exportMindMap || data.mindMap || null;
            exportRisk = exportRisk || data.risk || null;
          }
        } catch (fetchErr) {
          console.warn('Could not refresh project detail before PDF export:', fetchErr);
        }
      }

      if (!exportProject) {
        throw new Error('No project data available to export.');
      }

      const exportPayload: PdfExportData = {
        project: {
          id: exportProject.id || 'proj-1',
          title: exportProject.title || 'MindForge Project',
          goal: exportProject.goal || exportProject.title || 'Goal',
          description: exportProject.description || '',
          deadline: exportProject.deadline || new Date().toISOString().split('T')[0],
          survival_score: exportProject.survival_score ?? exportRisk?.survivalScore ?? 100,
          risk_level: exportProject.risk_level || exportRisk?.riskLevel || 'low',
          total_estimated_hours: exportProject.total_estimated_hours,
          created_at: exportProject.created_at,
        },
        tasks: (exportTasks || []).map((t: any, idx: number) => ({
          id: t.id || String(idx),
          title: t.title || 'Task',
          description: t.description || '',
          status: t.status || 'pending',
          priority_score: typeof t.priority_score === 'number' ? t.priority_score : (t.priorityScore ?? 50),
          estimated_minutes: t.estimated_minutes || t.estimatedMinutes || 60,
          is_critical: Boolean(t.is_critical),
          can_skip: Boolean(t.can_skip),
          why_priority: t.why_priority || t.whyPriority || '',
          order_index: typeof t.order_index === 'number' ? t.order_index : idx,
        })),
        dependencies: (exportDeps || []).map((d: any) => ({
          task_id: d.task_id || d.taskId,
          depends_on_task_id: d.depends_on_task_id || d.dependsOnTaskId,
        })),
        mindMap: exportMindMap || null,
        risk: exportRisk ? {
          riskLevel: exportRisk.riskLevel || 'low',
          survivalScore: exportRisk.survivalScore ?? 100,
          recommendation: exportRisk.recommendation,
          failureReason: exportRisk.failureReason,
        } : null,
        userInput: userInput || exportProject.goal || '',
      };

      // Dynamically import client-side PDF export
      const { exportToPdf } = await import('@/lib/pdf-export');
      await exportToPdf(exportPayload);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('PDF Export failed:', err);
      setError(err?.message || 'Failed to generate PDF. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setExporting(false);
    }
  };

  const getButtonClass = () => {
    let base = 'btn ';
    if (variant === 'primary') base += 'btn-primary ';
    else if (variant === 'ghost') base += 'btn-ghost ';
    else if (variant === 'outline') base += 'btn-outline ';
    else base += 'btn-secondary ';

    if (size === 'sm') base += 'btn-sm ';
    return `${base} ${className}`.trim();
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', position: 'relative' }}>
      <button
        id="export-pdf-btn"
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className={getButtonClass()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          cursor: exporting ? 'not-allowed' : 'pointer',
          opacity: exporting ? 0.7 : 1,
          transition: 'all 0.2s ease',
          ...style,
        }}
        title="Download project as a real vector PDF document"
      >
        {exporting ? (
          <>
            <div
              className="loading-spinner"
              style={{
                width: 14,
                height: 14,
                borderWidth: 2,
                borderTopColor: 'var(--brand-blue, #3b82f6)',
              }}
            />
            <span>Generating PDF...</span>
          </>
        ) : success ? (
          <>
            <span style={{ color: 'var(--success, #10b981)' }}>✓</span>
            <span style={{ color: 'var(--success, #10b981)' }}>PDF Downloaded</span>
          </>
        ) : (
          <>
            <span>📄</span>
            <span>{label}</span>
          </>
        )}
      </button>

      {error && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 50,
            background: '#ef4444',
            color: '#fff',
            fontSize: '0.72rem',
            padding: '4px 8px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
