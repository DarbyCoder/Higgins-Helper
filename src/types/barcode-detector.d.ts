export {};

/** The browser's Shape Detection API, where it exists (src/utils/barcodeScanner.ts). */
declare global {
  interface DetectedBarcode {
    rawValue: string;
    format: string;
  }

  interface BarcodeDetectorInstance {
    detect(image: HTMLVideoElement | ImageBitmap): Promise<DetectedBarcode[]>;
  }

  var BarcodeDetector: {
    new (opts: { formats: string[] }): BarcodeDetectorInstance;
    getSupportedFormats?(): Promise<string[]>;
  };
}
