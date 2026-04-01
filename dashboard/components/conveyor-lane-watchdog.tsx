'use client';

import { motion } from 'motion/react';
import type { ErrorLog } from '@/lib/types';

interface Props {
  errors: ErrorLog[];
}

export default function ConveyorLaneWatchdog({ errors }: Props) {
  const openErrors = errors.filter((e) => !e.auto_debug);
  const latest = errors[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.26 }}
      className="rounded-xl px-3.5 py-3"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}
      aria-label="Watchdog Lane"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className="glow-dot inline-block rounded-full flex-shrink-0"
            style={{
              width: '7px',
              height: '7px',
              backgroundColor: '#f472b6',
              boxShadow: '0 0 8px #f472b6',
            }}
            aria-hidden="true"
          />
          <span className="text-white text-[11px] font-semibold">Watchdog</span>
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            monitoring
          </span>
        </div>
        <span
          className="text-[10px] font-semibold"
          style={{ color: openErrors.length > 0 ? '#f472b6' : 'rgba(255,255,255,0.2)' }}
        >
          {openErrors.length} open
        </span>
      </div>

      {/* Error grid */}
      {errors.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2" aria-label="Error status grid">
          {errors.slice(0, 24).map((e, i) => {
            const resolved = e.auto_debug === true;
            return (
              <div
                key={`${e.timestamp}-${i}`}
                className="rounded-[4px] flex items-center justify-center text-[8px] font-bold"
                style={{
                  width: '22px',
                  height: '22px',
                  background: resolved
                    ? 'rgba(52,211,153,0.04)'
                    : 'rgba(244,114,182,0.04)',
                  border: `1px solid ${resolved ? 'rgba(52,211,153,0.10)' : 'rgba(244,114,182,0.10)'}`,
                  color: resolved ? '#34d399' : '#f472b6',
                  boxShadow: resolved ? undefined : '0 0 4px rgba(244,114,182,0.1)',
                }}
                title={`${e.type}: ${e.error_message?.slice(0, 60)}`}
                aria-label={resolved ? 'resolved error' : 'open error'}
              >
                {resolved ? '✓' : '!'}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom info */}
      {latest && (
        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Latest:{' '}
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>
            {latest.type}
          </span>
          {' · '}
          {latest.error_message?.slice(0, 50)}
          {(latest.error_message?.length ?? 0) > 50 ? '…' : ''}
        </p>
      )}

      {errors.length === 0 && (
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          No errors logged
        </p>
      )}
    </motion.div>
  );
}
