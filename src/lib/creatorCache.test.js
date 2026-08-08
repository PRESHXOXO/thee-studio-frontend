import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

let mockSession = null;
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ session: mockSession }),
}));

vi.mock('./cloudStore.js', () => ({
  persistCloudDocument: vi.fn(() => Promise.resolve()),
}));

const { loadCharacters, saveCharacters, useCachedCreators } = await import('./creatorCache.js');

const USER_A = { id: 'user-a' };
const USER_B = { id: 'user-b' };

function seedStorage(list) {
  localStorage.setItem('ts_characters', JSON.stringify(list));
}

beforeEach(() => {
  localStorage.clear();
  mockSession = null;
});

describe('ts_characters cache isolation', () => {
  // The real per-user separation happens at the storage layer, before React
  // ever sees it: AuthContext awaits bootstrapCloudStore(userId) — which
  // clears every USER_SCOPED_CACHE_KEYS entry and repopulates only from that
  // user's studio_documents rows — before it updates `session`. These tests
  // model that already-correct sequencing (storage is swapped first) and
  // verify the piece that wasn't automatic: React state built with
  // useState(loadCharacters) staying stale in memory afterward.

  it('user A cached creators are invisible to user B once storage is (correctly) swapped', () => {
    seedStorage([{ id: 1, name: 'Amara (User A)' }]);
    mockSession = USER_A;
    const { result, rerender } = renderHook(() => useCachedCreators());
    expect(result.current[0]).toEqual([{ id: 1, name: 'Amara (User A)' }]);

    // Simulate bootstrapCloudStore already having cleared+repopulated
    // storage for User B by the time `session` changes.
    seedStorage([{ id: 2, name: 'Jordan (User B)' }]);
    mockSession = USER_B;
    rerender();

    expect(result.current[0]).toEqual([{ id: 2, name: 'Jordan (User B)' }]);
    expect(result.current[0].some(c => c.name.includes('User A'))).toBe(false);
  });

  it('switching accounts clears in-memory state even to an empty roster (sign-out case)', () => {
    seedStorage([{ id: 1, name: 'Amara' }]);
    mockSession = USER_A;
    const { result, rerender } = renderHook(() => useCachedCreators());
    expect(result.current[0]).toHaveLength(1);

    localStorage.removeItem('ts_characters'); // bootstrap already cleared it — no session
    mockSession = null;
    rerender();

    expect(result.current[0]).toEqual([]);
  });

  it('switching back to a previously-seen account restores only that account\'s own scoped cache, not a stale mix', () => {
    seedStorage([{ id: 1, name: 'Amara (User A)' }]);
    mockSession = USER_A;
    const { result, rerender } = renderHook(() => useCachedCreators());

    seedStorage([{ id: 2, name: 'Jordan (User B)' }]);
    mockSession = USER_B;
    rerender();
    expect(result.current[0]).toEqual([{ id: 2, name: 'Jordan (User B)' }]);

    // Back to A — storage has already been swapped back by bootstrap.
    seedStorage([{ id: 1, name: 'Amara (User A)' }]);
    mockSession = USER_A;
    rerender();
    expect(result.current[0]).toEqual([{ id: 1, name: 'Amara (User A)' }]);
  });

  it('does not re-read storage (and so cannot pick up a leftover legacy global cache) on every render — only on an actual session change', () => {
    seedStorage([{ id: 1, name: 'Amara' }]);
    mockSession = USER_A;
    const { result, rerender } = renderHook(() => useCachedCreators());

    // Storage mutated without a session change (e.g. some other tab wrote a
    // legacy/global value) — must NOT be silently adopted mid-session.
    seedStorage([{ id: 999, name: 'Unrelated cached data' }]);
    rerender();

    expect(result.current[0]).toEqual([{ id: 1, name: 'Amara' }]);
  });

  it('cloudCreatorId survives a write through the shared cache module and reload', () => {
    const withCloudId = [{ id: 1754620848970, name: 'Amara', cloudCreatorId: '00000000-0000-0000-0000-000000000111' }];
    saveCharacters(withCloudId);
    expect(loadCharacters()).toEqual(withCloudId);
  });

  it('the setter returned by useCachedCreators updates in-memory state immediately (Cast save/sync UX)', () => {
    mockSession = USER_A;
    const { result } = renderHook(() => useCachedCreators());
    act(() => {
      result.current[1]([{ id: 1, name: 'Freshly saved' }]);
    });
    expect(result.current[0]).toEqual([{ id: 1, name: 'Freshly saved' }]);
  });
});
