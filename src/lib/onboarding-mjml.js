/**
 * Build MJML markup from blocks config + recipient data.
 * This produces a rich, modular email with card-based blocks,
 * colored accents, and visual hierarchy.
 *
 * All text and branding is customizable from the admin UI:
 * - Welcome title, header title, subtitle, footer text → salutation block options
 * - Accent color → salutation block options
 * - Auto-send notice → closing block options
 * - Per-block section labels → each block's section_label_fr / section_label_en options
 * - Block content → each block's content_fr / content_en
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

// Convert plain text to HTML paragraphs with bullet list support
function textToHtml(text) {
  return text
    .split(/\n\n+/)
    .map((para) => {
      const trimmed = para.trim()
      if (!trimmed) return ''
      // Check if this paragraph is a bullet list
      const lines = trimmed.split('\n')
      const allBullets = lines.every((l) => l.trim().startsWith('- ') || l.trim().startsWith('• '))
      if (allBullets && lines.length > 1) {
        const items = lines
          .map((l) => l.trim().replace(/^[-•]\s*/, ''))
          .map((item) => `<li style="margin:0 0 6px 0;padding-left:4px;">${item}</li>`)
          .join('')
        return `<ul style="margin:0 0 14px 0;padding-left:18px;list-style:none;">${items}</ul>`
      }
      // Check if paragraph starts with Q: / R: or Q: / A: (FAQ format)
      if (trimmed.match(/^[QR]:\s/m) || trimmed.match(/^[QA]:\s/m)) {
        const faqLines = trimmed.split('\n').map((line) => {
          if (line.match(/^Q:\s/)) {
            return `<p style="margin:0 0 4px 0;color:#1e293b;font-weight:600;">&#x2753; ${line.slice(3)}</p>`
          }
          if (line.match(/^[RA]:\s/)) {
            return `<p style="margin:0 0 12px 0;color:#64748b;padding-left:24px;">${line.slice(3)}</p>`
          }
          return `<p style="margin:0 0 6px 0;">${line}</p>`
        })
        return faqLines.join('')
      }
      return `<p style="margin:0 0 14px 0;line-height:1.7;">${trimmed.replace(/\n/g, '<br/>')}</p>`
    })
    .filter(Boolean)
    .join('\n')
}

// Block visual config: emoji icon + accent color + default labels
const BLOCK_THEME = {
  salutation:      { emoji: '&#x1F44B;', color: '#22c55e', label_fr: 'Bienvenue',          label_en: 'Welcome' },
  email_info:      { emoji: '&#x1F4E7;', color: '#3b82f6', label_fr: 'Email',              label_en: 'Email' },
  building_info:   { emoji: '&#x1F3E2;', color: '#f59e0b', label_fr: 'B\u00e2timent',      label_en: 'Building' },
  it_security:     { emoji: '&#x1F6E1;', color: '#ef4444', label_fr: 'S\u00e9curit\u00e9 IT', label_en: 'IT Security' },
  email_signature: { emoji: '&#x270D;',  color: '#8b5cf6', label_fr: 'Signature',           label_en: 'Signature' },
  sharepoint:      { emoji: '&#x1F4C1;', color: '#2563eb', label_fr: 'SharePoint',          label_en: 'SharePoint' },
  teams:           { emoji: '&#x1F4AC;', color: '#6366f1', label_fr: 'Teams',               label_en: 'Teams' },
  wifi:            { emoji: '&#x1F4F6;', color: '#06b6d4', label_fr: 'WiFi',                label_en: 'WiFi' },
  image_rights:    { emoji: '&#x1F4F7;', color: '#ec4899', label_fr: 'Droit \u00e0 l\'image', label_en: 'Image Rights' },
  faq_it:          { emoji: '&#x2753;',  color: '#f97316', label_fr: 'FAQ IT',              label_en: 'IT FAQ' },
  cta_link:        { emoji: '&#x1F517;', color: '#f97316', label_fr: 'Lien',                label_en: 'Link' },
  closing:         { emoji: '&#x2728;',  color: '#14b8a6', label_fr: 'Conclusion',          label_en: 'Closing' },
}

/**
 * Resolve the section label for a block — allows per-block override from block options
 */
function getSectionLabel(block, language) {
  const opts = block.options || {}
  const theme = BLOCK_THEME[block.block_key] || { label_fr: 'Bloc', label_en: 'Block' }

  // Per-block override from admin UI
  if (language === 'fr' && opts.section_label_fr) return opts.section_label_fr
  if (language === 'en' && opts.section_label_en) return opts.section_label_en

  // Default from theme
  return language === 'fr' ? theme.label_fr : theme.label_en
}

function buildBlockMjml(block, language, vars, index, totalEnabled) {
  const content = language === 'fr' ? block.content_fr : block.content_en
  if (!content) return ''

  const rendered = substituteVars(content, vars)
  const opts = block.options || {}
  const theme = BLOCK_THEME[block.block_key] || { emoji: '&#x1F4DD;', color: '#64748b', label_fr: 'Bloc', label_en: 'Block' }
  const sectionLabel = getSectionLabel(block, language)

  // Special handling: salutation block — hero greeting, no card wrapper
  if (block.block_key === 'salutation') {
    return `
    <mj-section background-color="#ffffff" padding="20px 32px 8px 32px">
      <mj-column>
        <mj-text color="#1e293b" font-size="16px" line-height="1.7" padding="0">
          ${textToHtml(rendered)}
        </mj-text>
      </mj-column>
    </mj-section>`
  }

  // Special handling: closing block — warm sign-off, no card
  if (block.block_key === 'closing') {
    return `
    <mj-section background-color="#ffffff" padding="16px 32px 8px 32px">
      <mj-column>
        <mj-divider border-color="#e2e8f0" border-width="1px" padding="0 0 16px 0" />
        <mj-text color="#64748b" font-size="14px" line-height="1.7" padding="0">
          ${textToHtml(rendered)}
        </mj-text>
      </mj-column>
    </mj-section>`
  }

  // CTA blocks: prominent button
  if (block.block_key === 'cta_link' && opts.url) {
    const btnLabel = language === 'fr'
      ? (opts.label_fr || 'Acceder')
      : (opts.label_en || 'Access')
    return `
    <mj-section background-color="#ffffff" padding="8px 32px">
      <mj-column background-color="#f8fafc" border-radius="12px" border="1px solid #e2e8f0" padding="0">
        <mj-text padding="16px 20px 8px 20px" font-size="12px" font-weight="700" color="${theme.color}" letter-spacing="1px">
          <span style="margin-right:6px;">${theme.emoji}</span> ${escapeHtml(sectionLabel.toUpperCase())}
        </mj-text>
        <mj-text padding="0 20px 12px 20px" color="#334155" font-size="14px" line-height="1.7">
          ${textToHtml(rendered)}
        </mj-text>
        <mj-button
          background-color="${theme.color}"
          color="#ffffff"
          border-radius="8px"
          font-size="14px"
          font-weight="600"
          padding="4px 20px 20px 20px"
          inner-padding="12px 32px"
          href="${escapeHtml(opts.url)}"
        >
          ${escapeHtml(btnLabel)} &#8594;
        </mj-button>
      </mj-column>
    </mj-section>`
  }

  // SharePoint / Teams: card with outline button
  if ((block.block_key === 'sharepoint' || block.block_key === 'teams') && opts.url) {
    const btnLabel = language === 'fr'
      ? (opts.label_fr || 'Ouvrir')
      : (opts.label_en || 'Open')
    return `
    <mj-section background-color="#ffffff" padding="8px 32px">
      <mj-column background-color="#f8fafc" border-radius="12px" border="1px solid #e2e8f0" padding="0">
        <mj-text padding="16px 20px 8px 20px" font-size="12px" font-weight="700" color="${theme.color}" letter-spacing="1px">
          <span style="margin-right:6px;">${theme.emoji}</span> ${escapeHtml(sectionLabel.toUpperCase())}
        </mj-text>
        <mj-text padding="0 20px 12px 20px" color="#334155" font-size="14px" line-height="1.7">
          ${textToHtml(rendered)}
        </mj-text>
        <mj-button
          background-color="transparent"
          color="${theme.color}"
          border="1px solid ${theme.color}"
          border-radius="8px"
          font-size="13px"
          font-weight="600"
          padding="4px 20px 20px 20px"
          inner-padding="10px 24px"
          href="${escapeHtml(opts.url)}"
        >
          ${escapeHtml(btnLabel)} &#8594;
        </mj-button>
      </mj-column>
    </mj-section>`
  }

  // WiFi block: info box with network details
  if (block.block_key === 'wifi') {
    return `
    <mj-section background-color="#ffffff" padding="8px 32px">
      <mj-column background-color="#f8fafc" border-radius="12px" border="1px solid #e2e8f0" padding="0">
        <mj-text padding="16px 20px 8px 20px" font-size="12px" font-weight="700" color="${theme.color}" letter-spacing="1px">
          <span style="margin-right:6px;">${theme.emoji}</span> ${escapeHtml(sectionLabel.toUpperCase())}
        </mj-text>
        <mj-text padding="0 20px 4px 20px" color="#334155" font-size="14px" line-height="1.7">
          ${textToHtml(rendered)}
        </mj-text>
        ${opts.network_name ? `
        <mj-text padding="8px 20px 16px 20px" color="#64748b" font-size="12px">
          <table cellpadding="0" cellspacing="0" style="width:100%;">
            <tr>
              <td style="background:${theme.color}15;border-radius:8px;padding:10px 14px;border:1px solid ${theme.color}30;">
                <span style="color:${theme.color};font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Network</span><br/>
                <span style="color:#1e293b;font-size:14px;font-weight:500;">${escapeHtml(opts.network_name)}</span>
              </td>
              ${opts.guest_network ? `
              <td style="width:12px;"></td>
              <td style="background:#f1f5f9;border-radius:8px;padding:10px 14px;border:1px solid #e2e8f0;">
                <span style="color:#94a3b8;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Guest</span><br/>
                <span style="color:#64748b;font-size:14px;font-weight:500;">${escapeHtml(opts.guest_network)}</span>
              </td>` : ''}
            </tr>
          </table>
        </mj-text>` : ''}
      </mj-column>
    </mj-section>`
  }

  // IT Security block: warning-style card
  if (block.block_key === 'it_security') {
    // Transform bullet points into styled list items
    const htmlContent = rendered
      .split(/\n\n+/)
      .map((para) => {
        const trimmed = para.trim()
        const lines = trimmed.split('\n')
        const allBullets = lines.every((l) => l.trim().startsWith('- ') || l.trim().startsWith('• '))
        if (allBullets) {
          const items = lines
            .map((l) => l.trim().replace(/^[-•]\s*/, ''))
            .map((item) => `
              <tr>
                <td style="padding:6px 0;vertical-align:top;width:24px;">
                  <span style="color:${theme.color};font-size:14px;">&#x26A0;</span>
                </td>
                <td style="padding:6px 0;color:#334155;font-size:13px;line-height:1.5;">${item}</td>
              </tr>`)
            .join('')
          return `<table cellpadding="0" cellspacing="0" style="width:100%;margin:4px 0 8px 0;">${items}</table>`
        }
        return `<p style="margin:0 0 12px 0;line-height:1.7;">${trimmed.replace(/\n/g, '<br/>')}</p>`
      })
      .filter(Boolean)
      .join('')

    return `
    <mj-section background-color="#ffffff" padding="8px 32px">
      <mj-column background-color="#f8fafc" border-radius="12px" border="1px solid ${theme.color}30" padding="0">
        <mj-text padding="16px 20px 4px 20px" font-size="12px" font-weight="700" color="${theme.color}" letter-spacing="1px">
          <span style="margin-right:6px;">${theme.emoji}</span> ${escapeHtml(sectionLabel.toUpperCase())}
        </mj-text>
        <mj-text padding="4px 20px 16px 20px" color="#334155" font-size="14px" line-height="1.7">
          ${htmlContent}
        </mj-text>
      </mj-column>
    </mj-section>`
  }

  // Email signature: info card with structured data
  if (block.block_key === 'email_signature') {
    return `
    <mj-section background-color="#ffffff" padding="8px 32px">
      <mj-column background-color="#f8fafc" border-radius="12px" border="1px solid #e2e8f0" padding="0">
        <mj-text padding="16px 20px 8px 20px" font-size="12px" font-weight="700" color="${theme.color}" letter-spacing="1px">
          <span style="margin-right:6px;">${theme.emoji}</span> ${escapeHtml(sectionLabel.toUpperCase())}
        </mj-text>
        <mj-text padding="0 20px 16px 20px" color="#334155" font-size="14px" line-height="1.7">
          ${textToHtml(rendered)}
        </mj-text>
      </mj-column>
    </mj-section>`
  }

  // FAQ block: styled Q&A format
  if (block.block_key === 'faq_it') {
    return `
    <mj-section background-color="#ffffff" padding="8px 32px">
      <mj-column background-color="#f8fafc" border-radius="12px" border="1px solid #e2e8f0" padding="0">
        <mj-text padding="16px 20px 8px 20px" font-size="12px" font-weight="700" color="${theme.color}" letter-spacing="1px">
          <span style="margin-right:6px;">${theme.emoji}</span> ${escapeHtml(sectionLabel.toUpperCase())}
        </mj-text>
        <mj-text padding="0 20px 16px 20px" color="#334155" font-size="14px" line-height="1.7">
          ${textToHtml(rendered)}
        </mj-text>
        ${opts.support_email ? `
        <mj-text padding="0 20px 16px 20px" color="#64748b" font-size="12px">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:${theme.color}15;border-radius:6px;padding:8px 12px;border:1px solid ${theme.color}30;">
                <span style="color:${theme.color};font-size:11px;font-weight:600;">&#x1F4E9; SUPPORT</span>
                <span style="color:#1e293b;margin-left:8px;">${escapeHtml(opts.support_email)}</span>
              </td>
            </tr>
          </table>
        </mj-text>` : ''}
      </mj-column>
    </mj-section>`
  }

  // Default: card module with colored header
  return `
    <mj-section background-color="#ffffff" padding="8px 32px">
      <mj-column background-color="#f8fafc" border-radius="12px" border="1px solid #e2e8f0" padding="0">
        <mj-text padding="16px 20px 8px 20px" font-size="12px" font-weight="700" color="${theme.color}" letter-spacing="1px">
          <span style="margin-right:6px;">${theme.emoji}</span> ${escapeHtml(sectionLabel.toUpperCase())}
        </mj-text>
        <mj-text padding="0 20px 16px 20px" color="#334155" font-size="14px" line-height="1.7">
          ${textToHtml(rendered)}
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
  const blocksSections = enabledBlocks
    .map((b, i) => buildBlockMjml(b, language, vars, i, enabledBlocks.length))
    .filter(Boolean)

  // Extract custom branding from salutation block options
  const salutationBlock = blocksConfig.find((b) => b.block_key === 'salutation')
  const salutationOpts = salutationBlock?.options || {}
  const closingBlock = blocksConfig.find((b) => b.block_key === 'closing')
  const closingOpts = closingBlock?.options || {}

  const headerTitle = salutationOpts.header_title || 'VO IT HUB'
  const headerSubtitle = language === 'fr'
    ? (salutationOpts.header_subtitle_fr || 'Votre guide d\'int\u00e9gration chez VO Group')
    : (salutationOpts.header_subtitle_en || 'Your onboarding guide at VO Group')
  const footerLabel = language === 'fr'
    ? (salutationOpts.footer_text_fr || 'Plateforme IT interne')
    : (salutationOpts.footer_text_en || 'Internal IT Platform')
  const autoNotice = language === 'fr'
    ? (closingOpts.auto_notice_fr || `Cet email a \u00e9t\u00e9 envoy\u00e9 automatiquement depuis ${headerTitle}`)
    : (closingOpts.auto_notice_en || `This email was sent automatically from ${headerTitle}`)

  // Customizable accent color (defaults to orange #f97316)
  const accentColor = salutationOpts.accent_color || '#f97316'

  // Customizable welcome title with variable substitution
  const welcomeTitlePattern = language === 'fr'
    ? (salutationOpts.welcome_title_fr || 'Bienvenue {{first_name}} !')
    : (salutationOpts.welcome_title_en || 'Welcome {{first_name}}!')
  const welcomeTitle = substituteVars(welcomeTitlePattern, vars)

  return `<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" />
      <mj-body background-color="#f1f5f9" />
      <mj-section background-color="#ffffff" />
      <mj-text color="#334155" font-size="14px" line-height="1.7" />
    </mj-attributes>
    <mj-style>
      a { color: #06b6d4; text-decoration: none; }
      a:hover { text-decoration: underline; }
      strong { color: #1e293b; }
      ul { margin: 0 0 14px 0; padding-left: 18px; }
      li { margin: 0 0 6px 0; padding-left: 4px; }
    </mj-style>
  </mj-head>
  <mj-body background-color="#f1f5f9">
    <!-- Spacer -->
    <mj-section background-color="transparent" padding="8px 0" />

    <!-- Header banner -->
    <mj-section background-color="#ffffff" border-radius="16px 16px 0 0" padding="0">
      <mj-column padding="0">
        <mj-divider border-color="${accentColor}" border-width="3px" padding="0" width="100%" />
        <mj-text padding="28px 32px 0 32px" font-size="11px" font-weight="700" color="${accentColor}" letter-spacing="2px">
          ${escapeHtml(headerTitle)}
        </mj-text>
        <mj-text padding="8px 32px 4px 32px" font-size="26px" font-weight="800" color="#1e293b" line-height="1.2">
          ${escapeHtml(welcomeTitle)}
        </mj-text>
        <mj-text padding="0 32px 0 32px" font-size="12px" color="#94a3b8">
          ${escapeHtml(headerSubtitle)}
        </mj-text>
        <mj-divider border-color="${accentColor}" border-width="3px" padding="16px 32px 0 32px" width="60px" />
      </mj-column>
    </mj-section>

    <!-- Content blocks -->
    ${blocksSections.join('\n')}

    <!-- Footer -->
    <mj-section background-color="#ffffff" padding="12px 32px 8px 32px">
      <mj-column>
        <mj-divider border-color="#e2e8f0" border-width="1px" padding="0 0 12px 0" />
      </mj-column>
    </mj-section>
    <mj-section background-color="#f8fafc" border-radius="0 0 16px 16px" padding="0 32px 28px 32px">
      <mj-column>
        <mj-text align="center" font-size="12px" color="#94a3b8" padding="0 0 4px 0">
          <span style="color:${accentColor};font-weight:700;">${escapeHtml(headerTitle.split(' ')[0] || 'VO')}</span> ${escapeHtml(headerTitle.split(' ').slice(1).join(' ') || 'IT HUB')} &mdash; ${escapeHtml(footerLabel)}
        </mj-text>
        <mj-text align="center" font-size="10px" color="#cbd5e1" padding="0">
          ${escapeHtml(autoNotice)}
        </mj-text>
      </mj-column>
    </mj-section>

    <!-- Bottom spacer -->
    <mj-section background-color="transparent" padding="8px 0" />
  </mj-body>
</mjml>`
}
