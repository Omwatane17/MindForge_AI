import { v4 as uuidv4 } from 'uuid';

export { uuidv4 as generateId };

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function daysUntil(dateStr: string): number {
  const now = new Date();
  const deadline = new Date(dateStr);
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function hoursUntil(dateStr: string): number {
  const now = new Date();
  const deadline = new Date(dateStr);
  return Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function getRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'low': return '#10B981';
    case 'medium': return '#F59E0B';
    case 'high': return '#EF4444';
    case 'critical': return '#DC2626';
    default: return '#6B7280';
  }
}

export function getSurvivalColor(score: number): string {
  if (score >= 75) return '#10B981';
  if (score >= 50) return '#F59E0B';
  if (score >= 25) return '#EF4444';
  return '#DC2626';
}

export function getPriorityLabel(score: number): string {
  if (score >= 85) return 'Critical';
  if (score >= 65) return 'High';
  if (score >= 45) return 'Medium';
  return 'Low';
}

export function getPriorityColor(score: number): string {
  if (score >= 85) return '#EF4444';
  if (score >= 65) return '#F59E0B';
  if (score >= 45) return '#3B82F6';
  return '#6B7280';
}

export function formatCountdown(dateStr: string): { days: number; hours: number; minutes: number; total: number } {
  const ms = new Date(dateStr).getTime() - Date.now();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, total: 0 };
  const total = Math.floor(ms / 1000 / 60);
  const days = Math.floor(total / 60 / 24);
  const hours = Math.floor((total % (60 * 24)) / 60);
  const minutes = total % 60;
  return { days, hours, minutes, total };
}
