// Polyfill DOMMatrix for Node.js — required by pdfjs-dist.
if (typeof globalThis.DOMMatrix === "undefined") {
  class DOMMatrixPoly {
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    is2D = true; isIdentity = true;

    constructor(init?: number[] | string) {
      if (Array.isArray(init)) {
        const v = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        init.forEach((x, i) => (v[i] = x));
        this.m11 = v[0]; this.m12 = v[1]; this.m13 = v[2]; this.m14 = v[3];
        this.m21 = v[4]; this.m22 = v[5]; this.m23 = v[6]; this.m24 = v[7];
        this.m31 = v[8]; this.m32 = v[9]; this.m33 = v[10]; this.m34 = v[11];
        this.m41 = v[12]; this.m42 = v[13]; this.m43 = v[14]; this.m44 = v[15];
        this.a = this.m11; this.b = this.m12; this.c = this.m21; this.d = this.m22;
        this.e = this.m41; this.f = this.m42;
      }
    }
    multiply() { return new DOMMatrixPoly(); }
    translate() { return new DOMMatrixPoly(); }
    scale() { return new DOMMatrixPoly(); }
    rotate() { return new DOMMatrixPoly(); }
    inverse() { return new DOMMatrixPoly(); }
    transformPoint(p?: unknown) { return p || { x: 0, y: 0, z: 0, w: 1 }; }
    static fromMatrix() { return new DOMMatrixPoly(); }
    static fromFloat32Array(a: Float32Array) { return new DOMMatrixPoly(Array.from(a)); }
    static fromFloat64Array(a: Float64Array) { return new DOMMatrixPoly(Array.from(a)); }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).DOMMatrix = DOMMatrixPoly;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).DOMMatrixReadOnly = DOMMatrixPoly;
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  // Pre-load the worker module into globalThis so pdfjs-dist uses it on the
  // main thread instead of trying to spawn/import a separate worker file.
  // This avoids "Cannot find module pdf.worker.mjs" in serverless environments.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(globalThis as any).pdfjsWorker) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: { str?: string }) => item.str ?? "").join(" ");
    pages.push(pageText);
  }
  await doc.destroy();

  return pages.join("\n");
}
