import { describe, expect, it, vi } from 'vitest';
import { createProviderRegistry } from './providers.js';

describe('cloud still provider safety', () => {
  it('invokes crisp-generate-stills with run-scoped idempotency', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { assets: [] }, error: null });
    const provider = createProviderRegistry({ functions: { invoke } }).still;
    const input = {
      runId: 'run-123',
      prompt: 'A safe staging test',
      negativePrompt: '',
      candidateCount: 1,
      aspectRatio: '9:16',
      shot: { id: 'shot-123', title: 'Staging' },
    };

    await provider.generate(input);

    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith('crisp-generate-stills', {
      body: input,
      headers: { 'idempotency-key': 'run-123' },
    });
  });
});
