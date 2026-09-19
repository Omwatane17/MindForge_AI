'use client';
import { useEffect, useState } from 'react';
import { formatCountdown } from '@/lib/utils';

interface DeadlineCountdownProps {
  deadline: string;
  compact?: boolean;
}

export default function DeadlineCountdown({ deadline, compact = false }: DeadlineCountdownProps) {
  const [countdown, setCountdown] = useState(formatCountdown(deadline));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(formatCountdown(deadline));
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [deadline]);

  const isUrgent = countdown.days < 1;
  const isCritical = countdown.total === 0;

  if (isCritical) {
    return (
      <div className="alert alert-danger" style={{ display: 'inline-flex' }}>
        ⚠️ Deadline has passed!
      </div>
    );
  }

  if (compact) {
    return (
      <span style={{ fontWeight: 700, color: isUrgent ? 'var(--danger)' : 'var(--text-primary)', fontSize: '0.875rem' }}>
        {countdown.days > 0 ? `${countdown.days}d ` : ''}{countdown.hours}h {countdown.minutes}m left
      </span>
    );
  }

  return (
    <div className="countdown">
      {countdown.days > 0 && (
        <>
          <div className="countdown-unit" style={{ borderColor: isUrgent ? 'rgba(239,68,68,0.3)' : undefined }}>
            <div className="countdown-value" style={{ color: isUrgent ? 'var(--danger)' : undefined }}>
              {countdown.days}
            </div>
            <div className="countdown-label">days</div>
          </div>
          <div className="countdown-sep">:</div>
        </>
      )}
      <div className="countdown-unit" style={{ borderColor: isUrgent ? 'rgba(239,68,68,0.3)' : undefined }}>
        <div className="countdown-value" style={{ color: isUrgent ? 'var(--danger)' : undefined }}>
          {String(countdown.hours).padStart(2, '0')}
        </div>
        <div className="countdown-label">hours</div>
      </div>
      <div className="countdown-sep">:</div>
      <div className="countdown-unit">
        <div className="countdown-value">
          {String(countdown.minutes).padStart(2, '0')}
        </div>
        <div className="countdown-label">mins</div>
      </div>
    </div>
  );
}
