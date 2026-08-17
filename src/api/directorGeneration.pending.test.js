import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./studio.js', () => ({
  castQuickShootPlain: vi.fn(),
  characterGenerate: vi.fn(),
  pollCastQuickShootStatus: vi.fn(),
  retryCastQuickShootSlot: vi.fn(),
}));

import { getPendingDirectorJob } from './directorGeneration.js';

const PREFIX = 'thee-studio:director-pending:v3:';
const key = scope => `${PREFIX}${encodeURIComponent(scope)}`;

describe('Director pending pointer age', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('keeps a recent pointer resumable', () => {
    const record = {
      parentBatchId: 'recent-parent',
      status: 'running',
      createdAt: new Date(Date.now() - 60_000).toISOString(),
    };
    localStorage.setItem(key('talk:cast-1:photo'), JSON.stringify(record));
    expect(getPendingDirectorJob('talk:cast-1:photo')).toMatchObject(record);
  });

  it('removes a pointer older than the recovery window instead of polling it', () => {
    const scope = 'talk:cast-1:photo';
    const record = {
      parentBatchId: 'yesterday-parent',
      status: 'running',
      createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    };
    sessionStorage.setItem(key(scope), JSON.stringify(record));
    localStorage.setItem(key(scope), JSON.stringify(record));

    expect(getPendingDirectorJob(scope)).toBeNull();
    expect(sessionStorage.getItem(key(scope))).toBeNull();
    expect(localStorage.getItem(key(scope))).toBeNull();
  });

  it('fails closed for legacy v3 pointers without an origin timestamp', () => {
    const scope = 'describe:cast-1';
    localStorage.setItem(key(scope), JSON.stringify({
      parentBatchId: 'unknown-age-parent',
      status: 'running',
    }));
    expect(getPendingDirectorJob(scope)).toBeNull();
  });
});
