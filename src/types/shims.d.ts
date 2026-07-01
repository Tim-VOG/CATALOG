// Type shims for third-party modules that ship without their own
// TypeScript declarations. Kept minimal — only the surface we call.

declare module 'qrcode' {
  interface QRCodeRenderOptions {
    width?: number
    margin?: number
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    color?: { dark?: string; light?: string }
  }
  const QRCode: {
    toCanvas(
      canvas: HTMLCanvasElement,
      text: string,
      options?: QRCodeRenderOptions,
    ): Promise<void>
    toDataURL(text: string, options?: QRCodeRenderOptions): Promise<string>
  }
  export default QRCode
}

declare module 'mjml-browser' {
  interface MJMLParseResults {
    html: string
    errors: unknown[]
  }
  function mjml2html(
    mjml: string,
    options?: Record<string, unknown>,
  ): MJMLParseResults
  export default mjml2html
}
