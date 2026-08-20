export {};

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
  };
}
