import React from 'react';
import {
  getDirectorBatchSnapshot,
  getPendingDirectorJob,
  resumeDirectorGeneration,
  retryDirectorGenerationSlot,
} from '../api/directorGeneration.js';
import { recoverDirectorPendingPointer } from '../api/directorRecovery.js';
import { generationBatchSummary, isTerminalBatchStatus } from '../lib/generationBatch.js';

const RETRY_DELAY_MS = 5000;

function uiStatus(status) {
  if (status === 'queued' || status === 'running') return 'still_processing';
  return status;
}

export function useDirectorPendingGeneration(scopeKey, { active = false, onSucceeded, onFailed, onBatchUpdate } = {}) {
  const initialRef = React.useRef(null);
  if (!initialRef.current) {
    const pending = getPendingDirectorJob(scopeKey);
    initialRef.current = { pending, batch: pending?.batch || getDirectorBatchSnapshot(scopeKey)?.batch || null };
  }
  const initialPending = initialRef.current.pending;
  const initialBatch = initialRef.current.batch;
  const [batch, setBatch] = React.useState(initialBatch);
  const [renderStatus, setRenderStatus] = React.useState(initialPending ? 'still_processing' : uiStatus(initialBatch?.status) || 'idle');
  const [statusMessage, setStatusMessage] = React.useState(initialPending ? 'This render is still processing. Director saved the job and will continue checking it.' : generationBatchSummary(initialBatch));
  const [retryingSlots, setRetryingSlots] = React.useState(() => new Set());
  const callbacks = React.useRef({ onSucceeded, onFailed, onBatchUpdate });
  const deliveredBatchRef = React.useRef(null);
  const retryResumeTimerRef = React.useRef(null);
  callbacks.current = { onSucceeded, onFailed, onBatchUpdate };

  const deliverTerminal = React.useCallback(result => {
    if (!result || !isTerminalBatchStatus(result.status)) return;
    const identity = `${result.parentBatchId || 'legacy'}:${result.status}:${result.updatedAt || result.succeededCount || 0}:${result.providerBlockedCount || 0}:${result.failedCount || 0}`;
    if (deliveredBatchRef.current === identity) return;
    deliveredBatchRef.current = identity;
    callbacks.current.onSucceeded?.(result);
  }, []);

  const handleStatus = React.useCallback(event => {
    if (!event?.status) return;
    const nextBatch = event.batch || null;
    if (nextBatch) {
      setBatch(nextBatch);
      callbacks.current.onBatchUpdate?.(nextBatch);
    }
    const nextStatus = uiStatus(event.status);
    setRenderStatus(nextStatus);
    if (event.status === 'generating') {
      setStatusMessage('Submitting one Director batch.');
    } else if (event.status === 'queued' || event.status === 'running' || event.status === 'still_processing') {
      setStatusMessage(event.persisted === false
        ? 'This render is still processing, but Director could not save the job in this browser session. Keep this tab open and do not submit it again.'
        : 'This render is still processing. Director saved the job and will continue checking it.');
    } else if (nextBatch) {
      setStatusMessage(generationBatchSummary(nextBatch));
      deliverTerminal(nextBatch);
    } else if (event.status === 'failed' || event.status === 'cancelled') {
      setStatusMessage(event.error || (event.status === 'cancelled' ? 'Render cancelled.' : 'Render failed.'));
    }
  }, [deliverTerminal]);

  React.useEffect(() => {
    deliveredBatchRef.current = null;
    const pending = getPendingDirectorJob(scopeKey);
    const snapshot = getDirectorBatchSnapshot(scopeKey)?.batch || null;
    const restoredBatch = pending?.batch || snapshot;
    setBatch(restoredBatch || null);
    setRetryingSlots(new Set());
    setRenderStatus(pending ? 'still_processing' : uiStatus(restoredBatch?.status) || 'idle');
    setStatusMessage(pending
      ? 'This render is still processing. Director saved the job and will continue checking it.'
      : generationBatchSummary(restoredBatch));
    if (!pending && snapshot) deliverTerminal(snapshot);
  }, [scopeKey, deliverTerminal]);

  React.useEffect(() => {
    if (active) return undefined;
    let disposed = false;
    let retryTimer = null;

    const check = async () => {
      if (disposed) return;
      try {
        if (!getPendingDirectorJob(scopeKey)) {
          const recovered = await recoverDirectorPendingPointer(scopeKey);
          if (disposed || !recovered) return;
          handleStatus({
            status: recovered.status || 'still_processing',
            batch: recovered.batch || null,
            persisted: true,
          });
        }
        const result = await resumeDirectorGeneration(scopeKey, { onStatus: handleStatus });
        if (!disposed && result) deliverTerminal(result);
      } catch (error) {
        if (disposed) return;
        if (error?.status === 'still_processing' || error?.code === 'DIRECTOR_STILL_PROCESSING') {
          handleStatus({ status: 'still_processing', persisted: error?.persisted });
          retryTimer = window.setTimeout(check, RETRY_DELAY_MS);
          return;
        }
        const status = error?.status === 'cancelled' ? 'cancelled' : 'failed';
        handleStatus({ status, error: error?.message });
        callbacks.current.onFailed?.(error);
      }
    };

    check();
    return () => {
      disposed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [active, scopeKey, handleStatus, deliverTerminal]);

  const continueRetryPolling = React.useCallback(() => {
    const check = async () => {
      try {
        const result = await resumeDirectorGeneration(scopeKey, { onStatus: handleStatus });
        if (result) deliverTerminal(result);
      } catch (error) {
        if (error?.status === 'still_processing' || error?.code === 'DIRECTOR_STILL_PROCESSING') {
          handleStatus({ status: 'still_processing', persisted: error?.persisted });
          retryResumeTimerRef.current = window.setTimeout(check, RETRY_DELAY_MS);
          return;
        }
        callbacks.current.onFailed?.(error);
      }
    };
    check();
  }, [scopeKey, handleStatus, deliverTerminal]);

  React.useEffect(() => () => {
    if (retryResumeTimerRef.current) window.clearTimeout(retryResumeTimerRef.current);
  }, [scopeKey]);

  const retrySlot = React.useCallback(async slotIndex => {
    setRetryingSlots(current => new Set(current).add(slotIndex));
    try {
      const result = await retryDirectorGenerationSlot(scopeKey, slotIndex, {
        parentBatchId: batch?.parentBatchId,
        onStatus: handleStatus,
      });
      deliverTerminal(result);
      return result;
    } catch (error) {
      if (error?.status === 'still_processing' || error?.code === 'DIRECTOR_STILL_PROCESSING') {
        handleStatus({ status: 'still_processing', persisted: error?.persisted });
        continueRetryPolling();
      } else {
        callbacks.current.onFailed?.(error);
      }
      throw error;
    } finally {
      setRetryingSlots(current => {
        const next = new Set(current);
        next.delete(slotIndex);
        return next;
      });
    }
  }, [scopeKey, batch?.parentBatchId, handleStatus, deliverTerminal, continueRetryPolling]);

  return {
    batch,
    renderStatus,
    statusMessage,
    retryingSlots,
    retrySlot,
    handleStatus,
    setBatch,
    setRenderStatus,
    setStatusMessage,
  };
}
