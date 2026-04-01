import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const STATE_FILE = join(import.meta.dirname, '.pipeline-state.json');

const FULL_PHASES = ['schema', 'convention', 'mockup', 'api', 'design', 'ui', 'seo', 'review', 'deploy'];

function readFile() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function writeFile(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  return state;
}

function deleteFile() {
  if (existsSync(STATE_FILE)) {
    unlinkSync(STATE_FILE);
  }
}

export function getState() {
  if (!existsSync(STATE_FILE)) return null;
  const state = readFile();
  if (state === null) {
    deleteFile();
    return null;
  }
  return state;
}

export function createState(type, input) {
  const state = {
    pipeline_id: randomUUID(),
    type,
    input,
    current_phase: 'design',
    status: 'running',
    created_at: new Date().toISOString(),
    phases: {
      design: { status: 'in_progress' },
    },
  };
  return writeFile(state);
}

export function updatePhase(phaseName, phaseStatus, extra = {}) {
  const state = getState();
  if (!state) throw new Error('No active pipeline state');
  state.phases[phaseName] = { ...state.phases[phaseName], status: phaseStatus, ...extra };
  state.current_phase = phaseName;
  return writeFile(state);
}

export function setAwaitingApproval() {
  const state = getState();
  if (!state) throw new Error('No active pipeline state');
  state.status = 'awaiting_approval';
  return writeFile(state);
}

export function setApproved() {
  const state = getState();
  if (!state) throw new Error('No active pipeline state');
  state.status = 'running';
  state.phases.design = { ...state.phases.design, approved: true };

  if (state.type === 'light') {
    state.current_phase = 'implement';
  } else {
    const currentIdx = FULL_PHASES.indexOf(state.current_phase);
    const nextPhase = currentIdx >= 0 && currentIdx < FULL_PHASES.length - 1
      ? FULL_PHASES[currentIdx + 1]
      : 'deploy';
    state.current_phase = nextPhase;
  }

  return writeFile(state);
}

export function complete() {
  const state = getState();
  if (!state) throw new Error('No active pipeline state');
  state.status = 'completed';
  deleteFile();
  return state;
}

export function cancel() {
  deleteFile();
}
