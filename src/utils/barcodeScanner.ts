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

/**
 * Shows the back camera in `video` and calls `onCode` with the first barcode
 * it reads, then stops the camera. Throws if the camera can't be opened
 * (refused, missing, or the page isn't on HTTPS).
 */
export async function startLiveScan(video: HTMLVideoElement, onCode: (code: string) => void): Promise<StopScan> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser can't open the camera here.");
  }
  video.setAttribute("playsinline", "true"); // iOS: play inline, not fullscreen
  video.muted = true;

  const detector = await nativeDetector();
  if (detector) {
    const stream = await navigator.mediaDevices.getUserMedia(CAMERA);
    let stopped = false;
    let timer = 0;
    const stop = () => {
      stopped = true;
      clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop());
    };
    video.srcObject = stream;
    await video.play();
    const tick = async () => {
      if (stopped) return;
      try {
        const [code] = await detector.detect(video);
        if (code && !stopped) {
          stop();
          onCode(code.rawValue);
          return;
        }
      } catch { /* the video isn't ready yet */ }
      timer = window.setTimeout(tick, 120);
    };
    tick();
    return stop;
  }

  const reader = await zxingReader();
  let done = false;
  const controls = await reader.decodeFromConstraints(CAMERA, video, (result, _err, ctrl) => {
    if (!result || done) return;
    done = true;
    ctrl.stop();
    onCode(result.getText());
  });
  return () => { done = true; controls.stop(); };
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
