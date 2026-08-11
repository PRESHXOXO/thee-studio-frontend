// Downscale + re-encode an image as JPEG to keep browser/cache payload sizes
// bounded without throwing away generation-critical identity detail. Creator
// references feed 1024×1536 image edits, so a 768px ceiling made legacy Cast
// photos behave like thumbnails and could produce visibly soft results.
export async function compressImage(src, maxPx = 1536, quality = 0.95) {
  let imageSrc = src;
  let objectUrl = null;

  if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);
      objectUrl = URL.createObjectURL(await response.blob());
      imageSrc = objectUrl;
    } catch {
      // Keep original source as fallback. Canvas export below is guarded too.
    }
  }

  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        // A cross-origin canvas must never leave callers awaiting forever.
        resolve(src);
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(src);
    };
    img.src = imageSrc;
  });
}

const VISION_IMAGE_ERROR = 'Could not read this photo. Use a JPG, PNG, or WebP image.';

// Vision APIs accept a smaller MIME set than browsers' image/* picker. Decode
// in-browser and re-encode to JPEG so mislabeled files never reach the backend.
export async function normalizeImageForVision(src, maxPx = 1536, quality = 0.92) {
  if (typeof src !== 'string' || !src.trim()) {
    throw new Error(VISION_IMAGE_ERROR);
  }

  let imageSrc = src;
  let objectUrl = null;

  if (!src.startsWith('data:') && !src.startsWith('blob:')) {
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error();
      objectUrl = URL.createObjectURL(await response.blob());
      imageSrc = objectUrl;
    } catch {
      throw new Error(VISION_IMAGE_ERROR);
    }
  } else if (src.startsWith('data:')) {
    // Some phones/file managers provide valid raster bytes under a generic
    // MIME. Correct known signatures before asking the browser to decode.
    const match = src.match(/^data:([^;,]*)(;base64)?,(.*)$/s);
    if (!match || !match[2]) throw new Error(VISION_IMAGE_ERROR);
    try {
      const bytes = atob(match[3].slice(0, 32));
      const code = index => bytes.charCodeAt(index);
      let detected = '';
      if (code(0) === 0xff && code(1) === 0xd8 && code(2) === 0xff) detected = 'image/jpeg';
      else if (code(0) === 0x89 && bytes.slice(1, 4) === 'PNG') detected = 'image/png';
      else if (bytes.slice(0, 4) === 'RIFF' && bytes.slice(8, 12) === 'WEBP') detected = 'image/webp';
      else if (bytes.slice(0, 3) === 'GIF') detected = 'image/gif';
      if (detected) imageSrc = `data:${detected};base64,${match[3]}`;
    } catch {
      throw new Error(VISION_IMAGE_ERROR);
    }
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    const fail = () => {
      cleanup();
      reject(new Error(VISION_IMAGE_ERROR));
    };
    const img = new Image();
    img.onload = () => {
      try {
        if (!img.width || !img.height) return fail();
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const context = canvas.getContext('2d');
        if (!context) return fail();
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        const normalized = canvas.toDataURL('image/jpeg', quality);
        cleanup();
        if (!normalized.startsWith('data:image/jpeg;base64,')) return fail();
        resolve(normalized);
      } catch {
        fail();
      }
    };
    img.onerror = fail;
    img.src = imageSrc;
  });
}
