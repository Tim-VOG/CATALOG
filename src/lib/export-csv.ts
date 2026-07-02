export function exportToCSV(data: any[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map((row: any) =>
    headers.map((h: any) => {
      let val = row[h]
      if (val === null || val === undefined) return ''
      if (typeof val === 'object') val = JSON.stringify(val)
      val = String(val).replace(/"/g, '""')
      return `"${val}"`
    }).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
