import QRCodeLib from 'qrcode'

/**
 * Generate a branded QR code with VO logo in the center and orange color.
 * Returns a data URL (PNG).
 */
export async function generateBrandedQR(code, { size = 400, label = '', logoText = 'VO' } = {}) {
  // Create base QR code as canvas
  const canvas = document.createElement('canvas')
  await QRCodeLib.toCanvas(canvas, code, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'H', // High correction to survive center logo
    color: {
      dark: '#f97316', // orange-500 (primary)
      light: '#ffffff',
    },
  })

  const ctx = canvas.getContext('2d')

  // Draw white circle in center for logo
  const centerX = size / 2
  const centerY = size / 2
  const logoRadius = size * 0.14

  ctx.beginPath()
  ctx.arc(centerX, centerY, logoRadius + 4, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  // Draw orange circle
  ctx.beginPath()
  ctx.arc(centerX, centerY, logoRadius, 0, Math.PI * 2)
  ctx.fillStyle = '#f97316'
  ctx.fill()

  // Draw "VO" text in center
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.round(logoRadius * 1.1)}px -apple-system, BlinkMacSystemFont, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(logoText, centerX, centerY + 1)

  // Add label below QR if provided
  if (label) {
    const extraHeight = 40
    const newCanvas = document.createElement('canvas')
    newCanvas.width = size
    newCanvas.height = size + extraHeight
    const newCtx = newCanvas.getContext('2d')

    // White background
    newCtx.fillStyle = '#ffffff'
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height)

    // Draw QR
    newCtx.drawImage(canvas, 0, 0)

    // Draw label
    newCtx.fillStyle = '#1e293b'
    newCtx.font = `bold ${Math.round(size * 0.035)}px -apple-system, BlinkMacSystemFont, sans-serif`
    newCtx.textAlign = 'center'
    newCtx.textBaseline = 'middle'
    newCtx.fillText(label, size / 2, size + 14)

    // Draw code below label
    newCtx.fillStyle = '#94a3b8'
    newCtx.font = `${Math.round(size * 0.025)}px monospace`
    newCtx.fillText(code, size / 2, size + 30)

    return newCanvas.toDataURL('image/png')
  }

  return canvas.toDataURL('image/png')
}

/**
 * Print multiple branded QR codes.
 */
export async function printBrandedQRCodes(items) {
  const images = await Promise.all(
    items.map(async ({ code, label }) => {
      const url = await generateBrandedQR(code, { size: 300, label })
      return { url, label, code }
    })
  )

  const win = window.open('', '_blank')
  win.document.write(`
    <html><head><title>VO Gear Hub — QR Codes</title>
    <style>
      body { font-family: -apple-system, sans-serif; display: flex; flex-wrap: wrap; gap: 16px; padding: 20px; justify-content: center; }
      .card { text-align: center; border: 1px solid #e2e8f0; padding: 8px; border-radius: 12px; width: 220px; }
      .card img { width: 200px; }
      @media print { body { gap: 8px; padding: 10px; } .card { break-inside: avoid; border-color: #ddd; } }
    </style></head><body>
    ${images.map(img => `<div class="card"><img src="${img.url}" /></div>`).join('')}
    </body></html>
  `)
  win.document.close()
  setTimeout(() => win.print(), 500)
}
