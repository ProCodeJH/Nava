'use client';

import { useAutoAnimate } from '@formkit/auto-animate/react';
import type { ActivityItem } from '@/lib/types';

interface Props {
  activity: ActivityItem[];
}

const CONVEYOR_COLORS: Record<ActivityItem['conveyor'], string> = {
  A: '#34d399',
  B: '#06b6d4',
  C: '#f472b6',
};

function formatTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '--:--';
  }
}

export default function ActivityFeed({ activity }: Props) {
  const [listRef] = useAutoAnimate<HTMLUListElement>();

  return (
    <section aria-label="Activity Feed">
      {/* Section header */}
      <div className="flex items-center justify-between py-2.5">
        <span
          className="text-[9px] font-bold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          Activity
        </span>
        <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.12)' }}>
          today
        </span>
      </div>

      {/* List */}
      {activity.length === 0 ? (
        <p className="text-[10px] py-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
          No activity yet
        </p>
      ) : (
        <ul ref={listRef} className="space-y-0" aria-live="polite">
          {activity.map((item, i) => {
            const dotColor = CONVEYOR_COLORS[item.conveyor];
            const isSuccess = item.status === 'success';

            return (
              <li
                key={`${item.timestamp}-${i}`}
                className="flex items-baseline gap-2"
                style={{ lineHeight: '2.2' }}
              >
                {/* Timestamp */}
                <span
                  className="text-[9px] flex-shrink-0 tabular-nums"
                  style={{ color: 'rgba(255,255,255,0.15)' }}
                >
                  {formatTime(item.timestamp)}
                </span>

                {/* Colored square */}
                <span
                  className="inline-block rounded-[3px] flex-shrink-0"
                  style={{
                    width: '7px',
                    height: '7px',
                    backgroundColor: dotColor,
                    opacity: 0.7,
                    flexShrink: 0,
                    alignSelf: 'center',
                  }}
                  aria-label={`Conveyor ${item.conveyor}`}
                />

                {/* Message */}
                <span
                  className="text-[10px] flex-1 min-w-0 truncate"
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                >
                  {item.message}
                </span>

                {/* Status */}
                {isSuccess && (
                  <span
                    className="text-[9px] flex-shrink-0 font-medium"
                    style={{ color: '#34d399' }}
                  >
                    ok
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
