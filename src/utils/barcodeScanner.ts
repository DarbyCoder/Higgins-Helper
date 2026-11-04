/**
 * @file src/utils/barcodeScanner.ts
 * @description Reads product barcodes (EAN-13/8, UPC-A/E) from the camera or a
 * photo, in every browser.
 *
 * Uses the browser's own BarcodeDetector where it has one that reads these
 * formats (Chrome on Android and macOS). Everywhere else, including every
 * iPhone browser, Firefox, and Chrome on Windows and Linux, it uses ZXing,
 * loaded only then so it costs nothing where it isn't needed.
 */

/** Stops the camera. Safe to call more than once. */
export type StopScan = () => void;

const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

/** Back camera, sharp enough for a barcode a hand's length away. */
const CAMERA: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
};

/** The browser's detector, or null if it has none that reads product barcodes. */
async function nativeDetector(): Promise<BarcodeDetectorInstance | null> {
  if (!("BarcodeDetector" in window)) return null;
  try {
    // Some desktop Chromes expose the API but support no formats
    const supported = await BarcodeDetector.getSupportedFormats?.();
    const formats = supported ? NATIVE_FORMATS.filter((f) => supported.includes(f)) : NATIVE_FORMATS;
    return formats.length ? new BarcodeDetector({ formats }) : null;
  } catch {
    return null;
  }
}

async function zxingReader() {
  const [{ BrowserMultiFormatOneDReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import("@zxing/browser"),
    import("@zxing/library"),
  ]);
  const hints = new Map<number, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  return new BrowserMultiFormatOneDReader(hints, { delayBetweenScanAttempts: 120 });
}

/** A running scan. `stop` works at any time, even before the camera is open. */
export interface LiveScan {
  /** Settles once the camera is showing; rejects if it can't be opened. */
  ready: Promise<void>;
  stop: StopScan;
}

/**
 * Shows the back camera in `video` and calls `onCode` with the first barcode
 * it reads, then stops the camera. `ready` rejects if the camera can't be
 * opened (refused, missing, or the page isn't on HTTPS).
 *
 * The camera is opened here, not by ZXing, so stopping one scan only ever
 * releases its own stream: a scan stopped while another starts on the same
 * video (React runs effects twice in development) can't blank the other.
 */
export function startLiveScan(video: HTMLVideoElement, onCode: (code: string) => void): LiveScan {
  let stopped = false;
  let stream: MediaStream | null = null;
  let timer = 0;

  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    stream?.getTracks().forEach((t) => t.stop());
    if (stream && video.srcObject === stream) video.srcObject = null;
  };

  const ready = (async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser can't open the camera here.");
    }
    // Load the reader while the camera permission prompt is up
    const decoderP = makeDecoder();
    const s = await navigator.mediaDevices.getUserMedia(CAMERA);
    if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
    stream = s;

    video.setAttribute("playsinline", "true"); // iOS: play inline, not fullscreen
    video.setAttribute("autoplay", "true");
    video.muted = true;
    video.srcObject = s;
    try { await video.play(); } catch { /* autoplay attribute takes over */ }

    const decode = await decoderP;
    const tick = async () => {
      if (stopped) return;
      if (video.readyState >= 2) {
        const code = await decode(video).catch(() => null);
        if (code && !stopped) {
          stop();
          onCode(code);
          return;
        }
      }
      if (!stopped) timer = window.setTimeout(tick, 120);
    };
    tick();
  })();

  return { ready, stop };
}

/** Reads one video frame: the browser's detector if it has one, else ZXing on a canvas copy. */
async function makeDecoder(): Promise<(video: HTMLVideoElement) => Promise<string | null>> {
  const detector = await nativeDetector();
  if (detector) {
    return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
  }
  const reader = await zxingReader();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  return async (video) => {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return null;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    try {
      return reader.decodeFromCanvas(canvas).getText();
    } catch {
      return null; // no barcode in this frame
    }
  };
}

/** Reads a barcode from a photo. Returns null if it can't find one. */
export async function decodeImageFile(file: File): Promise<string | null> {
  const detector = await nativeDetector();
  if (detector) {
    try {
      const [code] = await detector.detect(await createImageBitmap(file));
      if (code) return code.rawValue;
    } catch { /* try ZXing below */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const reader = await zxingReader();
    return (await reader.decodeFromImageUrl(url)).getText();
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
