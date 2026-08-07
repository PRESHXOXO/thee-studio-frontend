import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isLocalStudioServiceEnabled, LOCAL_ACTION_UNAVAILABLE } from './studio.js';

describe('cloud local-service guard', () => {
  it('disables localhost and Gradio transports in production cloud mode', () => {
    expect(isLocalStudioServiceEnabled({ PROD: true, DEV: false })).toBe(false);
    expect(isLocalStudioServiceEnabled({ PROD: true, DEV: false, VITE_ALLOW_LOCAL_MODE: 'true' })).toBe(true);
    expect(LOCAL_ACTION_UNAVAILABLE).toContain('unavailable in cloud');
  });

  it('guards named actions before telemetry or network transport', () => {
    const source = fs.readFileSync(path.resolve('src/api/studio.js'), 'utf8');
    const callStart = source.indexOf('async function callNamedEndpoint');
    const guard = source.indexOf('requireLocalStudioService();', callStart);
    const telemetry = source.indexOf('startUsageTelemetry(', callStart);
    const network = source.indexOf('fetch(`${BASE}/run/', callStart);
    expect(callStart).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(callStart);
    expect(guard).toBeLessThan(telemetry);
    expect(guard).toBeLessThan(network);
  });
});
