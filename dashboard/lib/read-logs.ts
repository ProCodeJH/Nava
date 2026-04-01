import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ReviewLog,
  PipelineLog,
  ErrorLog,
  ActivityItem,
  DashboardData,
} from './types';

const LOGS_BASE = 'C:/Users/exodia/.local/bin/Nava/naba-tools/logs';

function readJsonDir<T>(subdir: string): T[] {
  const dirPath = join(LOGS_BASE, subdir);

  if (!existsSync(dirPath)) {
    return [];
  }

  let files: string[];
  try {
    files = readdirSync(dirPath).filter(
      (f) => f.endsWith('.json') && f !== '.gitkeep'
    );
  } catch {
    return [];
  }

  const results: T[] = [];

  for (const file of files) {
    const filePath = join(dirPath, file);
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as T;
      results.push(parsed);
    } catch {
      // corrupt or unreadable file — skip
    }
  }

  // sort by timestamp descending
  results.sort((a, b) => {
    const ta = (a as { timestamp?: string }).timestamp ?? '';
    const tb = (b as { timestamp?: string }).timestamp ?? '';
    return tb.localeCompare(ta);
  });

  return results;
}

function buildActivity(
  reviews: ReviewLog[],
  pipelines: PipelineLog[],
  errors: ErrorLog[]
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const r of reviews) {
    const passed =
      r.result?.toLowerCase() === 'pass' ||
      r.result?.toLowerCase() === 'passed';
    items.push({
      timestamp: r.timestamp,
      conveyor: 'A',
      message: `Review ${r.commit_hash.slice(0, 7)} — ${r.summary.total_issues} issue(s) | ${r.result}`,
      status: passed ? 'success' : 'error',
    });
  }

  for (const p of pipelines) {
    const done = p.result?.toLowerCase() === 'done' || p.result?.toLowerCase() === 'success';
    items.push({
      timestamp: p.timestamp,
      conveyor: 'B',
      message: `Pipeline [${p.type}] ${p.pipeline_id} — ${p.result}`,
      status: done ? 'success' : 'running',
    });
  }

  for (const e of errors) {
    items.push({
      timestamp: e.timestamp,
      conveyor: 'C',
      message: `${e.type}: ${e.error_message.slice(0, 80)}`,
      status: e.severity === 'critical' ? 'error' : 'info',
    });
  }

  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return items.slice(0, 20);
}

export function getDashboardData(): DashboardData {
  const reviews = readJsonDir<ReviewLog>('reviews');
  const pipelines = readJsonDir<PipelineLog>('pipelines');
  const errors = readJsonDir<ErrorLog>('errors');
  const activity = buildActivity(reviews, pipelines, errors);

  const autoFixed = reviews.reduce(
    (sum, r) => sum + (r.summary?.auto_fixed ?? 0),
    0
  );

  const activePipelines = pipelines.filter(
    (p) =>
      p.result?.toLowerCase() !== 'done' &&
      p.result?.toLowerCase() !== 'success' &&
      p.result?.toLowerCase() !== 'failed'
  ).length;

  const resolvedErrors = errors.filter(
    (e) => e.auto_debug === true
  ).length;

  return {
    reviews,
    pipelines,
    errors,
    activity,
    stats: {
      totalReviews: reviews.length,
      autoFixed,
      activePipelines,
      totalErrors: errors.length,
      resolvedErrors,
    },
  };
}
