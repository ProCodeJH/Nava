'use client';

import { motion } from 'motion/react';
import type { DashboardData } from '@/lib/types';

interface Props {
  stats: DashboardData['stats'];
}

const CARDS = [
  {
    label: 'Code Quality',
    subtitle: 'pre-commit',
    color: '#34d399',
    getValue: (s: DashboardData['stats']) => s.totalReviews,
    getUnit: () => 'reviews',
  },
  {
    label: 'Feature Dev',
    subtitle: 'pipelines',
    color: '#06b6d4',
    getValue: (s: DashboardData['stats']) => s.activePipelines,
    getUnit: () => 'active',
    isLive: true,
  },
  {
    label: 'Watchdog',
    subtitle: 'monitoring',
    color: '#f472b6',
    getValue: (s: DashboardData['stats']) => s.totalErrors,
    getUnit: (s: DashboardData['stats']) => `${s.resolvedErrors} resolved`,
  },
];

export default function ConveyorLeads({ stats }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 px-3.5 mt-2">
      {CARDS.map((card, i) => {
        const isLive = card.isLive && stats.activePipelines > 0;

        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            className="relative overflow-hidden rounded-[14px] px-3 py-2.5"
            style={{
              background: `linear-gradient(160deg, ${card.color}0f 0%, ${card.color}03 100%)`,
              border: `1px solid ${card.color}1a`,
            }}
          >
            {/* Live shimmer overlay */}
            {isLive && (
              <div className="live-shimmer absolute inset-0 rounded-[14px] pointer-events-none" aria-hidden="true" />
            )}

            <div className="relative z-10">
              <p
                className="text-[8px] font-bold uppercase tracking-widest mb-1"
                style={{ color: card.color }}
              >
                {card.label}
              </p>
              <p className="text-[26px] font-extrabold text-white leading-none mb-0.5">
                {card.getValue(stats)}
              </p>
              <p
                className="text-[8px]"
                style={{ color: `${card.color}66` }}
              >
                {card.getUnit(stats)}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
