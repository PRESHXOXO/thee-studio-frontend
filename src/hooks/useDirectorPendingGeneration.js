import React from 'react';
import { getPendingDirectorJob, resumeDirectorGeneration } from '../api/directorGeneration.js';

const RETRY_DELAY_MS = 5000;

export function useDirectorPendingGeneration(scopeKey, { active = false, onSucceeded, onFailed } = {}) {
  const [renderStatus, setRenderStatus] = React.useState(() => getPendingDirectorJob(scopeKey) ? 'still_processing' : 'idle');
  const [statusMessage, setStatusMessage] = React.useState('');
  const callbacks = React.useRef({ onSucceeded, onFailed });
  callbacks.current = { onSucceeded, onFailed };

  const handleStatus = React.useCallback(event => {
    if (!event?.status) return;
    setRenderStatus(event.status);
    if (event.status === 'still_processing') {
      setStatusMessage(event.persisted === false
        ? 'This render is still processing, but Director could not save the job in this browser session. Keep this tab open and do not submit it again.'
        : 'This render is still processing. Director saved the job and will continue checking it.');
    } else if (event.status === 'failed' || event.status === 'cancelled') {
      setStatusMessage(event.error || (event.status === 'cancelled' ? 'Render cancelled.' : 'Render failed.'));
    } else if (event.status === 'succeeded') {
      setStatusMessage('Render completed.');
    } else {
      setStatusMessage('');
    }
  }, []);

  React.useEffect(() => {
    const pending = getPendingDirectorJob(scopeKey);
    setRenderStatus(pending ? 'still_processing' : 'idle');
    setStatusMessage(pending ? 'This render is still processing. Director saved the job and will continue checking it.' : '');
  }, [scopeKey]);

  React.useEffect(() => {
    if (active || !getPendingDirectorJob(scopeKey)?.jobId) return undefined;
    let disposed = false;
    let retryTimer = null;

    const check = async () => {
      if (disposed) return;
      try {
        const result = await resumeDirectorGeneration(scopeKey, { onStatus: handleStatus });
        if (!disposed && result?.status === 'succeeded') callbacks.current.onSucceeded?.(result);
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
  }, [active, scopeKey, handleStatus]);

  return { renderStatus, statusMessage, handleStatus, setRenderStatus, setStatusMessage };
}
