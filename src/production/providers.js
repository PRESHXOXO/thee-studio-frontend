const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));

async function invoke(db, functionName, body, headers) {
  const { data, error } = await db.functions.invoke(functionName, {
    body,
    ...(headers ? { headers } : {}),
  });
  if (error) throw new Error(`${functionName}: ${error.message}`);
  if (!data) throw new Error(`${functionName}: empty provider response`);
  return data;
}

class EdgeStillProvider {
  key = 'edge-still-v1';
  constructor(db) { this.db = db; }
  generate(input) {
    return invoke(this.db, 'crisp-generate-stills', input, {
      'idempotency-key': input.runId,
    });
  }
}

class EdgeClipProvider {
  key = 'edge-clip-v1';
  constructor(db) { this.db = db; }
  generate(input) { return invoke(this.db, 'crisp-generate-clip', input); }
}

class EdgeExportProvider {
  key = 'edge-export-v1';
  constructor(db) { this.db = db; }
  create(input) { return invoke(this.db, 'crisp-create-export', input); }
}

function demoStill(title, index) {
  const colors = [
    ['#ff7043', '#281647'],
    ['#8f7ee7', '#17122b'],
    ['#d96b52', '#3a1820'],
    ['#8271ce', '#241b3b'],
  ][index % 4];
  const safeTitle = String(title).replace(/[<>&]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient><filter id="n"><feTurbulence baseFrequency=".75" numOctaves="3"/><feBlend mode="soft-light" in="SourceGraphic"/></filter></defs><rect width="900" height="1200" fill="url(#g)"/><circle cx="450" cy="360" r="180" fill="#f1c8a6" opacity=".34"/><path d="M160 1120 Q230 590 450 580 Q670 590 740 1120" fill="#120d18" opacity=".58"/><rect width="900" height="1200" filter="url(#n)" opacity=".15"/><text x="50" y="1080" fill="#fff" font-family="Arial" font-size="34">${safeTitle}</text><text x="50" y="1130" fill="#f3d3c3" font-family="Arial" font-size="20">LOCAL PIPELINE PREVIEW · ${index + 1}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

class LocalStillProvider {
  key = 'local-preview-still';
  async generate(input) {
    await wait(350);
    return {
      externalRunId: crypto.randomUUID?.() || null,
      assets: Array.from({ length: input.candidateCount }, (_, index) => ({
        storagePath: null,
        externalUrl: demoStill(input.shot.title, index),
        width: 900,
        height: 1200,
        seed: 4100 + index,
        metadata: { localPreview: true, candidate: index + 1 },
      })),
      metadata: { localPreview: true },
    };
  }
}

class LocalClipProvider {
  key = 'local-preview-clip';
  async generate(input) {
    await wait(250);
    return {
      externalRunId: crypto.randomUUID?.() || null,
      storagePath: null,
      externalUrl: input.stillUrl,
      metadata: { localPreview: true, previewUsesHeroStill: true },
    };
  }
}

class LocalExportProvider {
  key = 'local-preview-export';
  async create(input) {
    await wait(150);
    return {
      externalRunId: crypto.randomUUID?.() || null,
      storagePath: null,
      externalUrl: input.sourceUrl,
      metadata: { localPreview: true },
    };
  }
}

export function createProviderRegistry(db) {
  if (db) {
    return {
      still: new EdgeStillProvider(db),
      clip: new EdgeClipProvider(db),
      export: new EdgeExportProvider(db),
    };
  }
  return {
    still: new LocalStillProvider(),
    clip: new LocalClipProvider(),
    export: new LocalExportProvider(),
  };
}
