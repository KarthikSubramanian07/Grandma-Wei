/**
 * Prepare a photo for Grandma, entirely in the browser:
 * honor the camera's orientation, shrink it to a sensible size, and re-encode
 * it as a fresh JPEG. Re-encoding drops all metadata, including GPS location.
 */

export interface Prepared {
  base64: string;
  mediaType: "image/jpeg";
  blob: Blob;
  width: number;
  height: number;
}

export class ImageError extends Error {}

const LONG_EDGE = 1568; // plenty for the model, small to upload

export async function preparePhoto(file: File | Blob): Promise<Prepared> {
  if (file.size > 40 * 1024 * 1024) throw new ImageError("That photo is enormous. Try a normal one.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageError("I couldn't open that photo. If it's HEIC, take a screenshot of it, or export it as a JPEG.");
  }
  const scale = Math.min(1, LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("This browser can't draw images. Try another one.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new ImageError("Couldn't prepare the photo."))), "image/jpeg", 0.84),
  );
  return { base64: await toBase64(blob), mediaType: "image/jpeg", blob, width, height };
}

async function toBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}
