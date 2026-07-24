// Downscale + re-encode an image as JPEG to keep payload sizes sane.
// Generated images can be same-origin URLs, not only data URLs. Fetch those
// into a blob first so canvas export cannot hang on a SecurityError.
export async function compressImage(src, maxPx = 768, quality = 0.92) {
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
