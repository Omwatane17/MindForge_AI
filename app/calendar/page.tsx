'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12];

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [availability, setAvailability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/calendar').then(r => r.json()).then(data => {
      setAvailability(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [status]);

  const updateAvailability = async (date: string, hours: number, notes?: string) => {
    setSaving(date);
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, availableHours: hours, notes }),
      });
      if (res.ok) {
        setAvailability(prev => prev.map(a => a.date === date ? { ...a, available_hours: hours } : a));
        setMessage('Saved!');
        setTimeout(() => setMessage(''), 2000);
      }
    } catch { }
    setSaving(null);
  };

  const totalAvailableHours = availability.reduce((s, a) => s + (a.available_hours || 8), 0);

  return (
    <AppLayout>
      <div className="page">
        <div className="page-header flex items-center justify-between flex-wrap gap-16">
          <div>
            <h1 className="page-title">🗓️ Calendar Availability</h1>
            <p className="page-subtitle">Set how many hours you're available each day for planning</p>
          </div>
          {message && (
            <div className="alert alert-success" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
              ✅ {message}
            </div>
          )}
        </div>

        <div className="alert alert-info mb-24" style={{ fontSize: '0.875rem' }}>
          ℹ️ MindForge uses your availability to calculate realistic deadlines and plan your daily workload. Set 0 for days you can't work.
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="loading-spinner" /></div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid-2 mb-24">
              <div className="stat-card">
                <div className="stat-label">Total Available (14 days)</div>
                <div className="stat-value">{totalAvailableHours}h</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Daily Average</div>
                <div className="stat-value">{availability.length > 0 ? (totalAvailableHours / availability.length).toFixed(1) : 0}h</div>
              </div>
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {availability.map((day: any) => {
                const date = new Date(day.date);
                const dayName = DAYS[date.getDay()];
                const isToday = day.date === new Date().toISOString().split('T')[0];
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                return (
                  <div key={day.date} id={`calendar-day-${day.date}`} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    background: 'var(--bg-card)',
                    border: `1px solid ${isToday ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    padding: '12px 16px',
                    flexWrap: 'wrap',
                  }}>
                    {/* Date */}
                    <div style={{ width: 80, flexShrink: 0 }}>
                      <div style={{
                        fontWeight: 800, fontSize: '0.875rem',
                        color: isToday ? 'var(--brand-blue)' : isWeekend ? 'var(--text-muted)' : 'var(--text-primary)'
                      }}>
                        {dayName}
                        {isToday && <span className="badge badge-blue" style={{ marginLeft: 6, fontSize: '0.6rem' }}>TODAY</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    {/* Hours slider */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        id={`hours-slider-${day.date}`}
                        type="range"
                        min={0}
                        max={12}
                        step={1}
                        value={day.available_hours ?? 8}
                        onChange={(e) => {
                          const h = parseInt(e.target.value);
                          setAvailability(prev => prev.map(a => a.date === day.date ? { ...a, available_hours: h } : a));
                        }}
                        onMouseUp={(e) => updateAvailability(day.date, parseInt((e.target as HTMLInputElement).value))}
                        onTouchEnd={(e) => updateAvailability(day.date, parseInt((e.target as HTMLInputElement).value))}
                        style={{ flex: 1, accentColor: 'var(--brand-blue)' }}
                      />
                    </div>

                    {/* Hours value */}
                    <div style={{ width: 60, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.125rem', color: day.available_hours === 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {day.available_hours ?? 8}h
                      </div>
                      {day.available_hours === 0 && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>OFF</div>
                      )}
                    </div>

                    {/* Quick buttons */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {[0, 4, 8].map(h => (
                        <button
                          key={h}
                          onClick={() => {
                            setAvailability(prev => prev.map(a => a.date === day.date ? { ...a, available_hours: h } : a));
                            updateAvailability(day.date, h);
                          }}
                          className={`btn btn-sm ${(day.available_hours ?? 8) === h ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          id={`quick-${h}h-${day.date}`}
                        >
                          {h === 0 ? 'Off' : `${h}h`}
                        </button>
                      ))}
                    </div>

                    {saving === day.date && (
                      <div className="loading-spinner" style={{ width: 16, height: 16, flexShrink: 0 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
