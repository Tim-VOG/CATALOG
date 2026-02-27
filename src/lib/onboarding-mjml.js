/**
 * Build MJML markup from blocks config + recipient data.
 * This is compiled to HTML by mjml-browser (client) or the edge function (server).
 */

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function substituteVars(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `[${key}]`)
}

function textToMjml(text) {
  // Convert plain text with newlines to HTML paragraphs
  return text
    .split(/\n\n+/)
    .map((para) => {
      const trimmed = para.trim()
      if (!trimmed) return ''
      return `<p style="margin:0 0 14px 0;line-height:1.7;">${trimmed.replace(/\n/g, '<br/>')}</p>`
    })
    .filter(Boolean)
    .join('\n')
}

function buildBlockMjml(block, language, vars) {
  const content = language === 'fr' ? block.content_fr : block.content_en
  if (!content) return ''

  const rendered = substituteVars(content, vars)
  const opts = block.options || {}

  // CTA blocks get a button
  if (block.block_key === 'cta_link' && opts.url) {
    const btnLabel = language === 'fr'
      ? (opts.label_fr || 'Acceder')
      : (opts.label_en || 'Access')
    return `
      <mj-section padding="0 32px">
        <mj-column>
          <mj-text color="#cbd5e1" font-size="14px" line-height="1.7" padding="12px 0">
            ${textToMjml(rendered)}
          </mj-text>
          <mj-button
            background-color="#f97316"
            color="#ffffff"
            border-radius="8px"
            font-size="14px"
            font-weight="600"
            padding="8px 0 20px 0"
            inner-padding="12px 28px"
            href="${escapeHtml(opts.url)}"
          >
            ${escapeHtml(btnLabel)}
          </mj-button>
        </mj-column>
      </mj-section>`
  }

  // SharePoint / Teams blocks with optional button
  if ((block.block_key === 'sharepoint' || block.block_key === 'teams') && opts.url) {
    const btnLabel = language === 'fr'
      ? (opts.label_fr || 'Ouvrir')
      : (opts.label_en || 'Open')
    return `
      <mj-section padding="0 32px">
        <mj-column>
          <mj-text color="#cbd5e1" font-size="14px" line-height="1.7" padding="12px 0">
            ${textToMjml(rendered)}
          </mj-text>
          <mj-button
            background-color="transparent"
            color="#06b6d4"
            border="1px solid #06b6d4"
            border-radius="8px"
            font-size="13px"
            font-weight="600"
            padding="4px 0 20px 0"
            inner-padding="10px 24px"
            href="${escapeHtml(opts.url)}"
          >
            ${escapeHtml(btnLabel)} &#8594;
          </mj-button>
        </mj-column>
      </mj-section>`
  }

  // Default: text block
  return `
    <mj-section padding="0 32px">
      <mj-column>
        <mj-text color="#cbd5e1" font-size="14px" line-height="1.7" padding="12px 0">
          ${textToMjml(rendered)}
        </mj-text>
      </mj-column>
    </mj-section>`
}

/**
 * Build complete MJML document from blocks config.
 *
 * @param {Array} blocksConfig - Array of { block_key, enabled, content_fr, content_en, options }
 * @param {string} language - 'fr' or 'en'
 * @param {Object} recipient - { first_name, last_name, email, team, department, start_date }
 * @returns {string} MJML markup
 */
export function buildMjmlFromBlocks(blocksConfig, language, recipient) {
  const vars = {
    first_name: recipient.first_name || '',
    last_name: recipient.last_name || '',
    email: recipient.email || '',
    team: recipient.team || '',
    department: recipient.department || '',
    start_date: recipient.start_date
      ? new Date(recipient.start_date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', {
          day: '2-digit', month: 'long', year: 'numeric',
        })
      : '',
  }

  const enabledBlocks = blocksConfig.filter((b) => b.enabled)
  const blocksSections = enabledBlocks.map((b) => buildBlockMjml(b, language, vars)).filter(Boolean)

  return `<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" />
      <mj-body background-color="#0f1419" />
      <mj-section background-color="#1a1f25" />
      <mj-text color="#cbd5e1" font-size="14px" line-height="1.7" />
    </mj-attributes>
    <mj-style>
      a { color: #06b6d4; text-decoration: none; }
      a:hover { text-decoration: underline; }
      strong { color: #f1f5f9; }
    </mj-style>
  </mj-head>
  <mj-body background-color="#0f1419">
    <!-- Header -->
    <mj-section background-color="#1a1f25" border-radius="12px 12px 0 0" padding="28px 32px 16px 32px">
      <mj-column>
        <mj-text font-size="22px" font-weight="700" color="#f97316" padding="0">
          VO Gear Hub
        </mj-text>
        <mj-text font-size="11px" color="#64748b" padding="2px 0 0 0">
          ${language === 'fr' ? 'Plateforme de pret d\'equipement' : 'Equipment Lending Platform'}
        </mj-text>
      </mj-column>
    </mj-section>

    <!-- Divider -->
    <mj-section background-color="#1a1f25" padding="0 32px">
      <mj-column>
        <mj-divider border-color="#1e293b" border-width="1px" padding="0" />
      </mj-column>
    </mj-section>

    <!-- Content blocks -->
    ${blocksSections.join('\n')}

    <!-- Footer -->
    <mj-section background-color="rgba(15,20,25,0.5)" border-radius="0 0 12px 12px" padding="20px 32px">
      <mj-column>
        <mj-text align="center" font-size="11px" color="#475569" padding="0">
          ${language === 'fr' ? 'Envoye depuis' : 'Sent from'} <span style="color:#64748b;font-weight:500;">VO Gear Hub</span>
        </mj-text>
        <mj-text align="center" font-size="10px" color="#334155" padding="4px 0 0 0">
          Equipment Lending Management System
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`
}
