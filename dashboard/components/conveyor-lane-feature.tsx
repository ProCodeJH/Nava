'use client';

import { motion } from 'motion/react';
import type { PipelineLog } from '@/lib/types';

interface Props {
  pipelines: PipelineLog[];
}

const PHASE_LABELS = ['Design', 'Implement', 'Verify'];

function getElapsed(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

function getPipelinePhaseStatus(
  pipeline: PipelineLog,
  phaseIndex: number
): 'completed' | 'active' | 'pending' {
  const phases = pipeline.phases ?? [];
  const relevantPhases = [
    phases.find((p) => p.name?.toLowerCase().includes('design')),
    phases.find(
      (p) =>
        p.name?.toLowerCase().includes('implement') ||
        p.name?.toLowerCase().includes('build') ||
        p.name?.toLowerCase().includes('code')
    ),
    phases.find(
      (p) =>
        p.name?.toLowerCase().includes('verify') ||
        p.name?.toLowerCase().includes('test') ||
        p.name?.toLowerCase().includes('review')
    ),
  ];

  const phase = relevantPhases[phaseIndex] ?? phases[phaseIndex];
  if (!phase) {
    // fallback: if pipeline is done, treat all as completed
    const isDone =
      pipeline.result?.toLowerCase() === 'done' ||
      pipeline.result?.toLowerCase() === 'success';
    return isDone ? 'completed' : 'pending';
  }

  if (phase.status === 'done' || phase.status === 'completed' || phase.status === 'passed') {
    return 'completed';
  }
  if (phase.status === 'running' || phase.status === 'active' || phase.status === 'in_progress') {
    return 'active';
  }
  return 'pending';
}

export default function ConveyorLaneFeature({ pipelines }: Props) {
  const activePipeline = pipelines.find(
    (p) =>
      p.result?.toLowerCase() !== 'done' &&
      p.result?.toLowerCase() !== 'success' &&
      p.result?.toLowerCase() !== 'failed'
  );
  const displayPipeline = activePipeline ?? pipelines[0];
  const isActive = !!activePipeline;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.18 }}
      className="relative overflow-hidden rounded-xl px-3.5 py-3"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}
      aria-label="Feature Development Lane"
    >
      {/* Live shimmer when active */}
      {isActive && (
        <div
          className="live-shimmer absolute inset-0 rounded-xl pointer-events-none"
          aria-hidden="true"
        />
      )}

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block rounded-full flex-shrink-0 ${isActive ? 'glow-dot' : ''}`}
              style={{
                width: '7px',
                height: '7px',
                backgroundColor: '#06b6d4',
                boxShadow: '0 0 8px #06b6d4',
              }}
              aria-hidden="true"
            />
            <span className="text-white text-[11px] font-semibold">Feature Dev</span>
            {isActive && (
              <span
                className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  color: '#06b6d4',
                  backgroundColor: 'rgba(6,182,212,0.08)',
                  border: '1px solid rgba(6,182,212,0.15)',
                }}
              >
                LIVE
              </span>
            )}
          </div>
          {displayPipeline && (
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {getElapsed(displayPipeline.timestamp)}
            </span>
          )}
        </div>

        {/* Pipeline flow */}
        {displayPipeline ? (
          <>
            <div className="flex items-center gap-1 mb-2.5" aria-label="Pipeline stages">
              {PHASE_LABELS.map((label, i) => {
                const status = getPipelinePhaseStatus(displayPipeline, i);

                let bg: string;
                let borderColor: string;
                let textColor: string;
                let shadow: string | undefined;

                if (status === 'completed') {
                  bg = 'rgba(52,211,153,0.06)';
                  borderColor = 'rgba(52,211,153,0.12)';
                  textColor = '#34d399';
                } else if (status === 'active') {
                  bg = 'rgba(6,182,212,0.08)';
                  borderColor = 'rgba(6,182,212,0.18)';
                  textColor = '#06b6d4';
                  shadow = '0 0 8px rgba(6,182,212,0.2)';
                } else {
                  bg = 'rgba(255,255,255,0.01)';
                  borderColor = 'rgba(255,255,255,0.04)';
                  textColor = 'rgba(255,255,255,0.15)';
                }

                return (
                  <div key={label} className="flex items-center gap-1 flex-1">
                    <div
                      className="flex-1 flex items-center justify-center rounded-[6px] py-1 px-2 text-[9px] font-semibold"
                      style={{
                        background: bg,
                        border: `1px solid ${borderColor}`,
                        color: textColor,
                        boxShadow: shadow,
                      }}
                    >
                      {status === 'completed' ? `${label} ✓` : label}
                    </div>
                    {i < PHASE_LABELS.length - 1 && (
                      <span
                        className="text-[10px] flex-shrink-0"
                        style={{ color: 'rgba(255,255,255,0.1)' }}
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom info */}
            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>
                {displayPipeline.input?.slice(0, 40)}
                {(displayPipeline.input?.length ?? 0) > 40 ? '…' : ''}
              </span>
              {' · '}
              {displayPipeline.type} pipeline
              {' · '}
              {displayPipeline.phases?.length ?? 0} phases
            </p>
          </>
        ) : (
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            No active pipeline
          </p>
        )}
      </div>
    </motion.div>
  );
}
