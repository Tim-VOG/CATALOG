import jsPDF from 'jspdf'
import QRCodeLib from 'qrcode'

interface QrEntry {
  code: string
  label?: string | null
}

/**
 * Render a printable A4 PDF with N QR-code stickers per page.
 * 5 columns × 7 rows = 35 per page, sized 36 × 36 mm — fits any
 * cheap A4 label sheet and stays readable from 30 cm away.
 *
 * The caller passes an array of { code, label } objects; the PDF
 * gets a header on the first page + a small footer with the
 * generation timestamp.
 */
export async function generateBulkQrPdf(entries: QrEntry[], title = 'VO Hub — QR stickers'): Promise<Blob> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  // A4 = 210 × 297 mm. Grid: 5 × 7 with 4 mm margin between cells.
  const pageW = 210
  const pageH = 297
  const cols = 5
  const rows = 7
  const marginX = 8
  const marginY = 12
  const cellGap = 3
  const cellW = (pageW - 2 * marginX - (cols - 1) * cellGap) / cols
  const cellH = (pageH - 2 * marginY - (rows - 1) * cellGap) / rows
  const qrSize = Math.min(cellW, cellH) - 8 // leave room for label

  const perPage = cols * rows
  const pages = Math.ceil(entries.length / perPage)

  for (let p = 0; p < pages; p++) {
    if (p > 0) pdf.addPage()

    // Header (first page only) — keeps the sheet wide
    if (p === 0) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.text(title, pageW / 2, 8, { align: 'center' })
    }

    const pageEntries = entries.slice(p * perPage, (p + 1) * perPage)
    for (let i = 0; i < pageEntries.length; i++) {
      const row = Math.floor(i / cols)
      const col = i % cols
      const x = marginX + col * (cellW + cellGap)
      const y = marginY + row * (cellH + cellGap)

      const entry = pageEntries[i]
      // Generate QR as data URL (high error correction so the label fits)
      const dataUrl = await QRCodeLib.toDataURL(entry.code, {
        errorCorrectionLevel: 'M',
        margin: 0,
        width: 400,
      })

      // Centre the QR horizontally inside the cell
      const qrX = x + (cellW - qrSize) / 2
      const qrY = y
      pdf.addImage(dataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

      // Label under the QR
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(40, 40, 40)
      const labelLine1 = entry.label || ''
      const labelLine2 = entry.code
      const labelY = qrY + qrSize + 3
      if (labelLine1) pdf.text(labelLine1.slice(0, 24), x + cellW / 2, labelY, { align: 'center' })
      pdf.setFontSize(6)
      pdf.setTextColor(120, 120, 120)
      pdf.text(labelLine2, x + cellW / 2, labelY + 3, { align: 'center' })
    }

    // Footer
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(160, 160, 160)
    pdf.text(
      `${pageEntries.length} sticker${pageEntries.length > 1 ? 's' : ''}  ·  Page ${p + 1}/${pages}  ·  ${new Date().toLocaleDateString('fr-FR')}`,
      pageW / 2,
      pageH - 6,
      { align: 'center' },
    )
  }

  return pdf.output('blob')
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
