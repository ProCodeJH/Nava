'use client';

import { motion } from 'motion/react';
import type { ReviewLog } from '@/lib/types';

interface Props {
  reviews: ReviewLog[];
}

export default function ConveyorLaneQuality({ reviews }: Props) {
  const latest = reviews[0];
  const isPassing =
    latest?.result?.toLowerCase() === 'pass' ||
    latest?.result?.toLowerCase() === 'passed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="rounded-xl px-3.5 py-3"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}
      aria-label="Code Quality Lane"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className="glow-dot inline-block rounded-full flex-shrink-0"
            style={{
              width: '7px',
              height: '7px',
              backgroundColor: '#34d399',
              boxShadow: '0 0 8px #34d399',
            }}
            aria-hidden="true"
          />
          <span className="text-white text-[11px] font-semibold">Code Quality</span>
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            pre-commit
          </span>
        </div>
        <span
          className="text-[10px] font-bold"
          style={{ color: isPassing ? '#34d399' : '#f472b6' }}
        >
          {latest ? (isPassing ? 'PASS' : 'FAIL') : 'NO DATA'}
        </span>
      </div>

      {/* History bar */}
      {reviews.length > 0 && (
        <div className="flex gap-0.5 mb-2" aria-label="Review history">
          {reviews.slice(0, 20).map((r, i) => {
            const hasCritical = r.summary?.critical > 0;
            const opacity = 0.4 + (i / reviews.length) * 0.6;
            return (
              <div
                key={`${r.timestamp}-${i}`}
                className="flex-1 min-w-[3px] rounded-sm"
                style={{
                  height: '4px',
                  backgroundColor: hasCritical ? '#f472b6' : '#34d399',
                  boxShadow: hasCritical ? '0 0 4px #f472b644' : undefined,
                  opacity,
                }}
                title={`${r.commit_hash?.slice(0, 7)} — ${r.result}`}
              />
            );
          })}
        </div>
      )}

      {/* Last review info */}
      {latest && (
        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Last:{' '}
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>
            {latest.commit_hash?.slice(0, 7)}
          </span>
          {' · '}
          {latest.summary?.total_issues ?? 0} issues
          {' · '}
          {latest.summary?.auto_fixed ?? 0} auto-fixed
          {' · '}
          {new Date(latest.timestamp).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}
    </motion.div>
  );
}
