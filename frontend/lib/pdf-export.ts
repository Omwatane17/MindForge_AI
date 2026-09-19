// lib/pdf-export.ts
// Generates a real, text-selectable PDF from the current MindForge AI project state.
// Uses jsPDF (client-side only, dynamically imported by ExportPdfButton).

import type { jsPDF as JsPDFType } from 'jspdf';
import { buildFlowchartLayout, wrapText, type FlowchartNode, type FlowchartEdge, type LayoutNode } from './flowchart-layout';

// ─── Data Types ───────────────────────────────────────────────────────────────

export interface PdfTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority_score: number;
  estimated_minutes: number;
  is_critical: number | boolean;
  can_skip: number | boolean;
  why_priority?: string;
  order_index: number;
}

export interface PdfDependency {
  task_id: string;
  depends_on_task_id: string;
}

export interface PdfMindMap {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
}

export interface PdfProject {
  id: string;
  title: string;
  goal: string;
  description?: string;
  deadline: string;
  survival_score?: number;
  risk_level?: string;
  total_estimated_hours?: number;
  created_at?: string;
}

export interface PdfRisk {
  riskLevel: string;
  survivalScore: number;
  recommendation?: string;
  failureReason?: string;
}

export interface PdfExportData {
  project: PdfProject;
  tasks: PdfTask[];
  dependencies?: PdfDependency[];
  mindMap?: PdfMindMap | null;
  risk?: PdfRisk | null;
  userInput?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND_BLUE = [59, 130, 246] as const;     // #3B82F6
const BRAND_VIOLET = [139, 92, 246] as const;   // #8B5CF6
const TEXT_PRIMARY = [15, 23, 42] as const;     // very dark navy
const TEXT_MUTED = [100, 116, 139] as const;    // slate-500
const SUCCESS = [16, 185, 129] as const;        // green
const WARNING = [245, 158, 11] as const;        // amber
const DANGER = [239, 68, 68] as const;          // red
const BG_LIGHT = [248, 250, 252] as const;      // slate-50
const BORDER = [226, 232, 240] as const;        // slate-200

const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mm2px(mm: number): number { return mm * 2.8346; }

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9\-_ ]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'MindForge-Export';
}

function setColor(doc: JsPDFType, rgb: readonly [number, number, number], type: 'fill' | 'text' | 'draw' = 'fill') {
  if (type === 'fill') doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  else if (type === 'text') doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  else doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function addPageFooter(doc: JsPDFType, pageNum: number, totalPages: number) {
  const pW = doc.internal.pageSize.getWidth();
  const pH = doc.internal.pageSize.getHeight();
  const y = pH - 10;
  setColor(doc, TEXT_MUTED, 'text');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('MindForge AI', MARGIN, y);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pW / 2, y, { align: 'center' });
  doc.text(`Page ${pageNum} of ${totalPages}`, pW - MARGIN, y, { align: 'right' });
  // Footer line
  setColor(doc, BORDER, 'draw');
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y - 3, pW - MARGIN, y - 3);
}

function checkNewPage(doc: JsPDFType, y: number, neededHeight: number, pages: { count: number }): number {
  if (y + neededHeight > PAGE_H - 18) {
    doc.addPage();
    pages.count++;
    return MARGIN + 8;
  }
  return y;
}

function drawSectionHeading(doc: JsPDFType, text: string, y: number): number {
  // Blue left bar
  setColor(doc, BRAND_BLUE, 'fill');
  doc.rect(MARGIN, y, 3, 6, 'F');
  // Heading text
  setColor(doc, BRAND_BLUE, 'text');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(text, MARGIN + 6, y + 5);
  // Underline
  setColor(doc, BRAND_BLUE, 'draw');
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 7, PAGE_W - MARGIN, y + 7);
  return y + 13;
}

function priorityColor(score: number): readonly [number, number, number] {
  if (score >= 85) return DANGER;
  if (score >= 65) return WARNING;
  if (score >= 45) return BRAND_BLUE;
  return TEXT_MUTED;
}

function priorityLabel(score: number): string {
  if (score >= 85) return 'Critical';
  if (score >= 65) return 'High';
  if (score >= 45) return 'Medium';
  return 'Low';
}

function riskColor(level: string): readonly [number, number, number] {
  if (level === 'low') return SUCCESS;
  if (level === 'medium') return WARNING;
  if (level === 'high') return DANGER;
  if (level === 'critical') return [220, 38, 38];
  return TEXT_MUTED;
}

// ─── Cover Page ───────────────────────────────────────────────────────────────

function buildCoverPage(doc: JsPDFType, data: PdfExportData) {
  const { project, risk, tasks } = data;

  // Background gradient bar at top
  setColor(doc, BRAND_BLUE, 'fill');
  doc.rect(0, 0, PAGE_W, 52, 'F');

  // Logo text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('MindForge AI', MARGIN, 24);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 220, 255);
  doc.text('AI-Powered Deadline Survival Engine', MARGIN, 33);

  // Generation date
  doc.setFontSize(8);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    PAGE_W - MARGIN, 33, { align: 'right' }
  );

  let y = 72;

  // Project title card
  setColor(doc, BG_LIGHT, 'fill');
  setColor(doc, BORDER, 'draw');
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y, CONTENT_W, 42, 3, 3, 'FD');

  setColor(doc, TEXT_MUTED, 'text');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('PROJECT GOAL', MARGIN + 8, y + 9);

  setColor(doc, TEXT_PRIMARY, 'text');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(project.goal || project.title, CONTENT_W - 16);
  doc.text(titleLines.slice(0, 2), MARGIN + 8, y + 19);

  if (project.description && project.description !== project.goal) {
    setColor(doc, TEXT_MUTED, 'text');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(project.description, CONTENT_W - 16);
    doc.text(descLines.slice(0, 2), MARGIN + 8, y + 31);
  }

  y += 52;

  // Stats row: 3 cards
  const cardW = (CONTENT_W - 12) / 3;
  const statsCards = [
    {
      label: 'DEADLINE',
      value: project.deadline ? new Date(project.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline set',
      sub: (() => {
        if (!project.deadline) return 'Self-paced';
        const d = Math.ceil((new Date(project.deadline + 'T00:00:00').getTime() - Date.now()) / 86400000);
        return d > 0 ? `${d} days remaining` : d === 0 ? 'Due today' : `${Math.abs(d)} days overdue`;
      })(),
      color: (() => {
        if (!project.deadline) return SUCCESS;
        const d = Math.ceil((new Date(project.deadline + 'T00:00:00').getTime() - Date.now()) / 86400000);
        return d < 3 ? DANGER : d < 7 ? WARNING : SUCCESS;
      })(),
    },
    {
      label: 'SURVIVAL SCORE',
      value: `${risk?.survivalScore ?? project.survival_score ?? 100}%`,
      sub: risk?.riskLevel ? `Risk: ${risk.riskLevel.toUpperCase()}` : 'On track',
      color: risk ? riskColor(risk.riskLevel) : SUCCESS,
    },
    {
      label: 'PROGRESS',
      value: (() => {
        const completed = tasks.filter(t => t.status === 'completed').length;
        return `${tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0}%`;
      })(),
      sub: (() => {
        const completed = tasks.filter(t => t.status === 'completed').length;
        return `${completed} of ${tasks.length} tasks done`;
      })(),
      color: (() => {
        const completed = tasks.filter(t => t.status === 'completed').length;
        const pct = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;
        return pct >= 75 ? SUCCESS : pct >= 40 ? WARNING : DANGER;
      })(),
    },
  ];

  for (let i = 0; i < statsCards.length; i++) {
    const card = statsCards[i];
    const cx = MARGIN + i * (cardW + 6);
    setColor(doc, BG_LIGHT, 'fill');
    setColor(doc, BORDER, 'draw');
    doc.setLineWidth(0.4);
    doc.roundedRect(cx, y, cardW, 34, 2, 2, 'FD');
    // Color accent bar on top
    setColor(doc, card.color, 'fill');
    doc.roundedRect(cx, y, cardW, 3, 1, 1, 'F');

    setColor(doc, TEXT_MUTED, 'text');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(card.label, cx + 6, y + 11);

    setColor(doc, card.color, 'text');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(card.value, cx + 6, y + 23);

    setColor(doc, TEXT_MUTED, 'text');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(card.sub, cx + 6, y + 30);
  }

  y += 44;

  // User input section
  if (data.userInput) {
    y += 4;
    y = drawSectionHeading(doc, 'Original Thought', y);
    setColor(doc, BG_LIGHT, 'fill');
    setColor(doc, BRAND_BLUE, 'draw');
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1, 1], 0);
    doc.rect(MARGIN, y, CONTENT_W, 1, 'S'); // top border
    doc.setLineDashPattern([], 0);

    setColor(doc, TEXT_MUTED, 'text');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    const inputLines = doc.splitTextToSize(`"${data.userInput}"`, CONTENT_W - 10);
    const inputH = inputLines.length * 5 + 10;
    setColor(doc, BG_LIGHT, 'fill');
    setColor(doc, BORDER, 'draw');
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_W, inputH, 2, 2, 'FD');
    // Left blue accent bar
    setColor(doc, BRAND_BLUE, 'fill');
    doc.rect(MARGIN, y, 3, inputH, 'F');
    setColor(doc, TEXT_MUTED, 'text');
    doc.text(inputLines, MARGIN + 7, y + 6);
    y += inputH + 6;
  }

  // Risk recommendation
  if (risk?.recommendation) {
    setColor(doc, BG_LIGHT, 'fill');
    setColor(doc, riskColor(risk.riskLevel), 'draw');
    doc.setLineWidth(0.4);
    const recLines = doc.splitTextToSize(risk.recommendation, CONTENT_W - 16);
    const recH = recLines.length * 5 + 12;
    doc.roundedRect(MARGIN, y, CONTENT_W, recH, 2, 2, 'FD');
    setColor(doc, riskColor(risk.riskLevel), 'fill');
    doc.rect(MARGIN, y, 3, recH, 'F');
    setColor(doc, riskColor(risk.riskLevel), 'text');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Recommendation', MARGIN + 7, y + 6);
    setColor(doc, TEXT_PRIMARY, 'text');
    doc.setFont('helvetica', 'normal');
    doc.text(recLines, MARGIN + 7, y + 12);
  }
}

// ─── Workflow Diagram Page ─────────────────────────────────────────────────────

function buildWorkflowPage(doc: JsPDFType, mindMap: PdfMindMap, pages: { count: number }) {
  doc.addPage('a4', 'landscape');
  pages.count++;

  const LW = 297;  // landscape width mm
  const LH = 210;  // landscape height mm
  const LM = 15;   // margin

  // Header bar
  setColor(doc, BRAND_BLUE, 'fill');
  doc.rect(0, 0, LW, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Workflow Diagram', LM, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 220, 255);
  doc.text('Hierarchical breakdown of your goal into actionable tasks', LM + 55, 10);

  const { layoutNodes, canvasWidth, canvasHeight } = buildFlowchartLayout(
    mindMap.nodes,
    mindMap.edges,
  );

  if (!layoutNodes.length) {
    setColor(doc, TEXT_MUTED, 'text');
    doc.setFontSize(10);
    doc.text('No workflow data available.', LW / 2, LH / 2, { align: 'center' });
    addPageFooter(doc, pages.count, pages.count);
    return;
  }

  // Scale to fit the available space
  const drawW = LW - LM * 2;
  const drawH = LH - 28;  // reserve header + footer
  const scaleX = drawW / canvasWidth;
  const scaleY = drawH / canvasHeight;
  const scale = Math.min(scaleX, scaleY, 1);  // never upscale beyond 1:1

  const offsetX = LM + (drawW - canvasWidth * scale) / 2;
  const offsetY = 20;

  const nodeById: Record<string, LayoutNode> = {};
  for (const n of layoutNodes) nodeById[n.id] = n;

  // Reusable coordinate transformer
  const tx = (x: number) => offsetX + x * scale;
  const ty = (y: number) => offsetY + y * scale;
  const ts = (s: number) => s * scale;

  // Draw edges first (behind nodes)
  setColor(doc, [148, 163, 184], 'draw'); // slate-400
  doc.setLineWidth(0.4);

  for (const edge of mindMap.edges) {
    const from = nodeById[edge.source];
    const to = nodeById[edge.target];
    if (!from || !to) continue;

    // Elbow connector: from bottom-centre of source to top-centre of target
    const x1 = tx(from.x);
    const y1 = ty(from.y + from.height);
    const x2 = tx(to.x);
    const y2 = ty(to.y);
    const midY = (y1 + y2) / 2;

    const isFromRoot = from.level === 0;
    if (isFromRoot) {
      setColor(doc, [59, 130, 246], 'draw');
      doc.setLineWidth(0.5);
    } else {
      setColor(doc, [148, 163, 184], 'draw');
      doc.setLineWidth(0.3);
    }

    // Draw orthogonal elbow
    doc.line(x1, y1, x1, midY);
    doc.line(x1, midY, x2, midY);
    doc.line(x2, midY, x2, y2);

    // Arrowhead (small triangle)
    const ah = 1.5 * scale;
    const aw = 1.0 * scale;
    doc.triangle(x2, y2, x2 - aw, y2 - ah, x2 + aw, y2 - ah, 'S');
  }

  // Draw nodes
  for (const node of layoutNodes) {
    const nx = tx(node.x - node.width / 2);
    const ny = ty(node.y);
    const nw = ts(node.width);
    const nh = ts(node.height);
    const isRoot = node.level === 0;

    // Node fill color
    let fillRgb: readonly [number, number, number];
    let borderRgb: readonly [number, number, number];

    if (isRoot) {
      fillRgb = [239, 246, 255]; // blue-50
      borderRgb = BRAND_BLUE;
    } else if (node.status === 'completed') {
      fillRgb = [240, 253, 249]; // green-50
      borderRgb = SUCCESS;
    } else if (node.status === 'in_progress') {
      fillRgb = [255, 251, 235]; // amber-50
      borderRgb = WARNING;
    } else {
      const pc = priorityColor(node.priority);
      fillRgb = [248, 250, 252];
      borderRgb = pc;
    }

    setColor(doc, fillRgb, 'fill');
    setColor(doc, borderRgb, 'draw');
    doc.setLineWidth(isRoot ? 0.7 : 0.4);
    doc.roundedRect(nx, ny, nw, nh, 1.5 * scale, 1.5 * scale, 'FD');

    // Left accent bar (non-root)
    if (!isRoot) {
      setColor(doc, borderRgb, 'fill');
      doc.rect(nx, ny + 2 * scale, 1.5 * scale, nh - 4 * scale, 'F');
    }

    // MAIN GOAL label for root
    if (isRoot) {
      setColor(doc, BRAND_BLUE, 'text');
      doc.setFontSize(Math.max(4, 6 * scale));
      doc.setFont('helvetica', 'bold');
      doc.text('MAIN GOAL', nx + nw / 2, ny - 1, { align: 'center' });
    }

    // Node text
    const maxChars = isRoot ? 22 : 24;
    const lines = wrapText(node.label, maxChars);
    const fontSize = Math.max(5, (isRoot ? 8 : 7) * scale);
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isRoot ? 'bold' : 'normal');
    setColor(doc, TEXT_PRIMARY, 'text');

    const lineH = fontSize * 0.4;
    const textStartY = ny + (nh - lines.length * lineH) / 2 + lineH * 0.85;
    const textX = isRoot ? nx + nw / 2 : nx + (isRoot ? 0 : 3 * scale) + 3 * scale;

    for (let li = 0; li < lines.length; li++) {
      doc.text(lines[li], isRoot ? textX : textX, textStartY + li * lineH, {
        align: isRoot ? 'center' : 'left',
      });
    }

    // Status dot for non-root
    if (!isRoot) {
      const dotColor = node.status === 'completed' ? SUCCESS : node.status === 'in_progress' ? WARNING : [148, 163, 184] as readonly [number, number, number];
      setColor(doc, dotColor, 'fill');
      doc.circle(nx + nw - 3 * scale, ny + 3 * scale, 1.2 * scale, 'F');
    }
  }

  addPageFooter(doc, pages.count, pages.count);
}

// ─── Tasks Pages ──────────────────────────────────────────────────────────────

function buildTasksPages(doc: JsPDFType, data: PdfExportData, pages: { count: number }) {
  doc.addPage();
  pages.count++;
  let y = MARGIN + 8;

  y = drawSectionHeading(doc, 'Action Items', y);
  y += 2;

  // Summary row
  const completed = data.tasks.filter(t => t.status === 'completed').length;
  const inProgress = data.tasks.filter(t => t.status === 'in_progress').length;
  const pending = data.tasks.filter(t => t.status === 'pending').length;
  const skipped = data.tasks.filter(t => t.status === 'skipped').length;
  const totalH = data.tasks.reduce((s, t) => s + t.estimated_minutes / 60, 0);
  const remainH = data.tasks.filter(t => t.status !== 'completed' && t.status !== 'skipped').reduce((s, t) => s + t.estimated_minutes / 60, 0);

  const summaryItems = [
    { label: 'Total', value: String(data.tasks.length), color: TEXT_MUTED },
    { label: 'Completed', value: String(completed), color: SUCCESS },
    { label: 'In Progress', value: String(inProgress), color: WARNING },
    { label: 'Pending', value: String(pending), color: BRAND_BLUE },
    { label: 'Skipped', value: String(skipped), color: TEXT_MUTED },
    { label: 'Total Work', value: `${totalH.toFixed(1)}h`, color: TEXT_MUTED },
    { label: 'Remaining', value: `${remainH.toFixed(1)}h`, color: pending > 0 ? WARNING : SUCCESS },
  ];

  const sw = CONTENT_W / summaryItems.length;
  setColor(doc, BG_LIGHT, 'fill');
  setColor(doc, BORDER, 'draw');
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, 20, 2, 2, 'FD');

  for (let i = 0; i < summaryItems.length; i++) {
    const item = summaryItems[i];
    const cx = MARGIN + i * sw + sw / 2;
    setColor(doc, TEXT_MUTED, 'text');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, cx, y + 7, { align: 'center' });
    setColor(doc, item.color, 'text');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, cx, y + 15, { align: 'center' });
  }
  y += 26;

  // Progress bar
  const pct = data.tasks.length > 0 ? (completed / data.tasks.length) * 100 : 0;
  setColor(doc, BORDER, 'fill');
  doc.roundedRect(MARGIN, y, CONTENT_W, 4, 2, 2, 'F');
  const fillColor = pct >= 75 ? SUCCESS : pct >= 40 ? WARNING : DANGER;
  setColor(doc, fillColor, 'fill');
  doc.roundedRect(MARGIN, y, CONTENT_W * (pct / 100), 4, 2, 2, 'F');
  setColor(doc, TEXT_MUTED, 'text');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`${Math.round(pct)}% complete`, PAGE_W - MARGIN, y + 3.5, { align: 'right' });
  y += 10;

  // Task list
  const sortedTasks = [...data.tasks].sort((a, b) => a.order_index - b.order_index);
  const depsMap: Record<string, string[]> = {};
  if (data.dependencies) {
    for (const dep of data.dependencies) {
      if (!depsMap[dep.task_id]) depsMap[dep.task_id] = [];
      depsMap[dep.task_id].push(dep.depends_on_task_id);
    }
  }
  const taskById: Record<string, PdfTask> = {};
  for (const t of data.tasks) taskById[t.id] = t;

  for (let idx = 0; idx < sortedTasks.length; idx++) {
    const task = sortedTasks[idx];
    const isCompleted = task.status === 'completed';
    const isSkipped = task.status === 'skipped';
    const isCritical = Boolean(task.is_critical);
    const pColor = priorityColor(task.priority_score);

    // Estimate task card height
    const descLines = task.description ? doc.splitTextToSize(task.description, CONTENT_W - 30) : [];
    const whyLines = task.why_priority ? doc.splitTextToSize(task.why_priority, CONTENT_W - 30) : [];
    const depTaskIds = depsMap[task.id] || [];
    const depNames = depTaskIds.map(id => taskById[id]?.title || id).filter(Boolean);
    const cardH = 18 + descLines.length * 4 + (whyLines.length > 0 ? whyLines.length * 4 + 6 : 0) + (depNames.length > 0 ? 8 : 0);

    y = checkNewPage(doc, y, cardH + 4, pages);
    if (y === MARGIN + 8) {
      // New page was added — re-draw minor section label
      setColor(doc, TEXT_MUTED, 'text');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Action Items (continued)', MARGIN, y);
      y += 8;
    }

    // Card background
    const bgRgb: readonly [number, number, number] = isCompleted ? [240, 253, 249] : isSkipped ? [248, 250, 252] : [255, 255, 255];
    setColor(doc, bgRgb, 'fill');
    setColor(doc, isCompleted ? SUCCESS : isCritical ? DANGER : BORDER, 'draw');
    doc.setLineWidth(isCompleted ? 0.5 : isCritical ? 0.6 : 0.3);
    doc.roundedRect(MARGIN, y, CONTENT_W, cardH, 1.5, 1.5, 'FD');

    // Priority left bar
    setColor(doc, pColor, 'fill');
    doc.rect(MARGIN, y + 2, 2.5, cardH - 4, 'F');

    // Task number
    setColor(doc, TEXT_MUTED, 'text');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`#${idx + 1}`, MARGIN + 5, y + 7);

    // Checkbox / status
    const checkX = MARGIN + 14;
    const checkY = y + 4;
    setColor(doc, isCompleted ? SUCCESS : BORDER, 'draw');
    doc.setLineWidth(0.5);
    doc.roundedRect(checkX, checkY, 5.5, 5.5, 0.8, 0.8, 'S');
    if (isCompleted) {
      setColor(doc, SUCCESS, 'draw');
      doc.setLineWidth(0.8);
      doc.line(checkX + 1, checkY + 3, checkX + 2.5, checkY + 4.5);
      doc.line(checkX + 2.5, checkY + 4.5, checkX + 4.5, checkY + 1.5);
    }

    // Title
    setColor(doc, isSkipped ? TEXT_MUTED : TEXT_PRIMARY, 'text');
    doc.setFontSize(9.5);
    doc.setFont('helvetica', isCompleted ? 'normal' : 'bold');
    const titleX = checkX + 8;
    const titleMaxW = CONTENT_W - (titleX - MARGIN) - 30;
    const titleLines = doc.splitTextToSize(task.title, titleMaxW);
    doc.text(titleLines[0], titleX, y + 8.5);
    if (isCompleted) {
      // Strikethrough
      const tw = doc.getTextWidth(titleLines[0].slice(0, 40));
      setColor(doc, TEXT_MUTED, 'draw');
      doc.setLineWidth(0.4);
      doc.line(titleX, y + 7.5, titleX + tw, y + 7.5);
    }

    // Badges (right side)
    let bx = PAGE_W - MARGIN - 4;
    const badgeY = y + 5;

    // Priority badge
    const plabel = priorityLabel(task.priority_score);
    const pbw = doc.getTextWidth(plabel) + 4;
    setColor(doc, pColor, 'fill');
    doc.roundedRect(bx - pbw, badgeY, pbw, 5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(plabel, bx - pbw / 2, badgeY + 3.5, { align: 'center' });
    bx -= pbw + 3;

    // Critical badge
    if (isCritical) {
      const cw = 20;
      setColor(doc, DANGER, 'fill');
      doc.roundedRect(bx - cw, badgeY, cw, 5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.text('CRITICAL', bx - cw / 2, badgeY + 3.5, { align: 'center' });
      bx -= cw + 3;
    }

    // Status badge
    const slabel = task.status.replace('_', ' ').toUpperCase();
    const sw2 = doc.getTextWidth(slabel) + 4;
    const sc = task.status === 'completed' ? SUCCESS : task.status === 'in_progress' ? WARNING : task.status === 'skipped' ? TEXT_MUTED : [71, 85, 105] as const;
    setColor(doc, sc, 'fill');
    doc.roundedRect(bx - sw2, badgeY, sw2, 5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(slabel, bx - sw2 / 2, badgeY + 3.5, { align: 'center' });

    // Time estimate
    setColor(doc, TEXT_MUTED, 'text');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const mins = task.estimated_minutes;
    const timeStr = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? (mins % 60) + 'm' : ''}`.trim();
    doc.text(`⏱ ${timeStr}`, MARGIN + 5, y + 14);

    let textY = y + 17;

    // Description
    if (descLines.length > 0) {
      setColor(doc, TEXT_MUTED, 'text');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(descLines, titleX, textY);
      textY += descLines.length * 4 + 1;
    }

    // Why priority
    if (whyLines.length > 0) {
      setColor(doc, [59, 130, 246], 'text');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text('💡 ' + whyLines.join(' '), titleX, textY);
      textY += whyLines.length * 4 + 2;
    }

    // Dependencies
    if (depNames.length > 0) {
      setColor(doc, TEXT_MUTED, 'text');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`🔗 Depends on: ${depNames.join(' → ')}`, titleX, textY);
    }

    y += cardH + 4;
  }

  addPageFooter(doc, pages.count, pages.count);
}

// ─── Main Export Function ─────────────────────────────────────────────────────

export async function exportToPdf(data: PdfExportData): Promise<void> {
  // Dynamically import jsPDF to keep it out of the main bundle
  const { jsPDF } = await import('jspdf');
  // Import autotable for future use (registers the plugin)
  await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pages = { count: 1 };

  // Page 1: Cover
  buildCoverPage(doc, data);
  addPageFooter(doc, 1, 1); // placeholder — we'll update after all pages are created

  // Page 2: Workflow diagram (landscape)
  if (data.mindMap?.nodes?.length) {
    buildWorkflowPage(doc, data.mindMap, pages);
  }

  // Page 3+: Tasks
  if (data.tasks.length > 0) {
    buildTasksPages(doc, data, pages);
  }

  // Update all page footers with correct total count
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pW = doc.internal.pageSize.getWidth();
    const pH = doc.internal.pageSize.getHeight();
    // Clear old footer area (white rect over it)
    doc.setFillColor(255, 255, 255);
    doc.rect(0, pH - 15, pW, 15, 'F');
    addPageFooter(doc, i, totalPages);
  }

  // Download
  const filename = `MindForge-${sanitizeFilename(data.project.goal || data.project.title)}.pdf`;
  doc.save(filename);
}
