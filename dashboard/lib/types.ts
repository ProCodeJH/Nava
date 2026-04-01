export interface ReviewIssue {
  file?: string;
  line?: number | null;
  severity: 'critical' | 'minor';
  category?: string;
  message: string;
  auto_fixed?: boolean;
}

export interface ReviewLog {
  timestamp: string;
  commit_hash: string;
  files_reviewed: string[];
  reviewers_used: string[];
  duration_ms: number;
  issues: ReviewIssue[];
  result: string;
  summary: { total_issues: number; critical: number; minor: number; auto_fixed: number };
}

export interface PipelineLog {
  timestamp: string;
  pipeline_id: string;
  type: 'light' | 'full';
  input: string;
  phases: { name: string; status: string; duration_ms?: number }[];
  result: string;
  total_duration_ms: number;
}

export interface ErrorLog {
  timestamp: string;
  type: 'bash_error' | 'test_fail' | 'session_error';
  severity: 'critical' | 'warning';
  command: string;
  exit_code: number;
  error_message: string;
  auto_debug: boolean;
}

export interface ActivityItem {
  timestamp: string;
  conveyor: 'A' | 'B' | 'C';
  message: string;
  status: 'success' | 'error' | 'running' | 'info';
}

export interface DashboardData {
  reviews: ReviewLog[];
  pipelines: PipelineLog[];
  errors: ErrorLog[];
  activity: ActivityItem[];
  stats: {
    totalReviews: number;
    autoFixed: number;
    activePipelines: number;
    totalErrors: number;
    resolvedErrors: number;
  };
}
