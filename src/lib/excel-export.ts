import * as XLSX from 'xlsx'

/**
 * Wrap an array of plain objects in a worksheet + return the
 * XLSX writer cells. `header` reorders columns explicitly so the
 * output stays stable across runs.
 */
function sheetFromRows<T extends Record<string, unknown>>(rows: T[], header?: (keyof T)[]): XLSX.WorkSheet {
  if (!rows.length) return XLSX.utils.aoa_to_sheet([['(empty)']])
  return XLSX.utils.json_to_sheet(rows, header ? { header: header as string[] } : undefined)
}

interface ExportPayload {
  products?: any[]
  categories?: any[]
  qrCodes?: any[]
  deviceCredentials?: any[]
  activeLoans?: any[]
  scanLogs?: any[]
  sharedMailboxes?: any[]
  // Request flows — combined into a single "Requests" tab.
  equipmentRequests?: any[]
  itRequests?: any[] // onboarding / offboarding / IT (type on each row)
  mailboxRequests?: any[]
}

// Normalise the different request shapes into a single set of columns so
// equipment, onboarding/offboarding/IT and mailbox requests read side by side.
function normaliseRequests(payload: ExportPayload) {
  const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString('fr-FR') : '')
  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
  const rows: Record<string, string>[] = []

  for (const r of payload.equipmentRequests || []) {
    rows.push({
      Type: 'Equipment',
      Status: r.status || '',
      Requester: r.user_name || r.user_email || '',
      Subject: r.event_name || r.project_name || '',
      Created: fmtDate(r.created_at),
    })
  }

  for (const r of payload.itRequests || []) {
    const d = r.data || {}
    const subject = (`${d.first_name || ''} ${d.last_name || ''}`).trim()
      || d.name || d.email_to_create || ''
    rows.push({
      Type: cap(r.type || 'IT'),
      Status: r.status || '',
      Requester: r.requester_name || r.requester_email || '',
      Subject: subject,
      Created: fmtDate(r.created_at),
    })
  }

  for (const r of payload.mailboxRequests || []) {
    rows.push({
      Type: 'Mailbox',
      Status: r.status || '',
      Requester: r.requester_name || r.requester_email || r.created_by_name || '',
      Subject: r.email_to_create || r.project_name || '',
      Created: fmtDate(r.created_at),
    })
  }

  // Newest first so the report opens on the most recent activity.
  rows.sort((a, b) => (b.Created || '').localeCompare(a.Created || ''))
  return rows
}

/**
 * Build and trigger a download for an .xlsx workbook with one tab
 * per data domain. Empty domains are skipped so the file stays tidy.
 */
export function exportInventoryWorkbook(payload: ExportPayload, filename = 'vo-hub-inventory.xlsx') {
  const wb = XLSX.utils.book_new()

  const requestRows = normaliseRequests(payload)
  if (requestRows.length) {
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows(requestRows, ['Type', 'Status', 'Requester', 'Subject', 'Created']),
      'Requests',
    )
  }

  if (payload.products?.length) {
    const rows = payload.products.map((p: any) => ({
      Name: p.name,
      Category: p.category_name || p.category?.name || '',
      'Total stock': p.total_stock,
      Description: p.description || '',
      Visible: p.is_visible ? 'Yes' : 'No',
      Created: p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '',
    }))
    XLSX.utils.book_append_sheet(wb, sheetFromRows(rows), 'Products')
  }

  if (payload.categories?.length) {
    const rows = payload.categories.map((c: any) => ({ Name: c.name, Color: c.color || '' }))
    XLSX.utils.book_append_sheet(wb, sheetFromRows(rows), 'Categories')
  }

  if (payload.qrCodes?.length) {
    const rows = payload.qrCodes.map((q: any) => ({
      Code: q.code,
      Label: q.label || '',
      Product: q.product_name || '',
      Category: q.category_name || '',
      Status: q.status || 'available',
      'Assigned to': q.assigned_to_name || '',
      'Assigned email': q.assigned_to_email || '',
      'Assigned at': q.assigned_at ? new Date(q.assigned_at).toLocaleString('fr-FR') : '',
      Active: q.is_active ? 'Yes' : 'No',
    }))
    XLSX.utils.book_append_sheet(wb, sheetFromRows(rows), 'QR Codes')
  }

  if (payload.deviceCredentials?.length) {
    const rows = payload.deviceCredentials.map((d: any) => ({
      Code: d.qr_code?.code || '',
      Product: d.qr_code?.product?.name || '',
      Category: d.qr_code?.product?.category?.name || '',
      Status: d.qr_code?.status || '',
      'Assigned to': d.qr_code?.assigned_to_name || '',
      IMEI: d.imei || '',
      Serial: d.serial_number || '',
      Phone: d.phone_number || '',
      'SIM ICCID': d.sim_iccid || '',
      'SIM PIN': d.sim_pin || '',
      Carrier: d.carrier || '',
      MAC: d.mac_address || '',
      'WiFi SSID': d.wifi_ssid || '',
      'WiFi pwd': d.wifi_password || '',
      'Router pwd': d.router_password || '',
      OS: d.os_version || '',
      Notes: d.notes || '',
    }))
    XLSX.utils.book_append_sheet(wb, sheetFromRows(rows), 'Device Credentials')
  }

  if (payload.activeLoans?.length) {
    const rows = payload.activeLoans.map((l: any) => ({
      'QR code': l.qr_code,
      Product: l.product_name,
      'Holder': l.user_name || l.user_email || '',
      Email: l.user_email || '',
      'Picked up': l.pickup_date ? new Date(l.pickup_date).toLocaleDateString('fr-FR') : '',
      'Expected return': l.expected_return_date ? new Date(l.expected_return_date).toLocaleDateString('fr-FR') : '',
    }))
    XLSX.utils.book_append_sheet(wb, sheetFromRows(rows), 'Active loans')
  }

  if (payload.scanLogs?.length) {
    const rows = payload.scanLogs.map((s: any) => ({
      Time: s.created_at ? new Date(s.created_at).toLocaleString('fr-FR') : '',
      Action: s.action === 'take' ? 'Picked up' : s.action === 'deposit' ? 'Returned' : s.action,
      'QR code': s.qr_code,
      Product: s.product_name || '',
      User: s.user_name || s.user_email || '',
    }))
    XLSX.utils.book_append_sheet(wb, sheetFromRows(rows), 'Scan logs')
  }

  if (payload.sharedMailboxes?.length) {
    const rows = payload.sharedMailboxes.map((m: any) => ({
      Name: m.name || '',
      Email: m.mail || '',
      Company: m.company || '',
      Category: m.category || '',
      Licence: m.licence || '',
      Profile: m.profile || '',
      'Project leader': m.project_leader || '',
      'Display name': m.display_name || '',
      'Has access': m.have_access || '',
      Created: m.created_in || '',
    }))
    XLSX.utils.book_append_sheet(wb, sheetFromRows(rows), 'Shared mailboxes')
  }

  // Cover page — context for the recipient
  const cover = XLSX.utils.aoa_to_sheet([
    ['VO Hub — Inventory export'],
    [''],
    ['Generated', new Date().toLocaleString('fr-FR')],
    ['Source', typeof window !== 'undefined' ? window.location.host : ''],
    [''],
    ['Sheet', 'Rows'],
    ['Requests', requestRows.length],
    ['Products', payload.products?.length || 0],
    ['Categories', payload.categories?.length || 0],
    ['QR Codes', payload.qrCodes?.length || 0],
    ['Device Credentials', payload.deviceCredentials?.length || 0],
    ['Active loans', payload.activeLoans?.length || 0],
    ['Scan logs', payload.scanLogs?.length || 0],
    ['Shared mailboxes', payload.sharedMailboxes?.length || 0],
  ])
  XLSX.utils.book_append_sheet(wb, cover, 'README')

  XLSX.writeFile(wb, filename)
}
