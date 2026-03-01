/**
 * Apple Device SVG Silhouettes
 * Minimalist monochrome silhouettes for Apple products.
 * Each icon is a simple SVG path designed to be rendered at 24x24 (viewBox="0 0 24 24").
 * Use currentColor for the fill/stroke to inherit parent color.
 */

export const APPLE_DEVICE_ICONS = {
  'macbook-pro': {
    name: 'MacBook Pro',
    tags: ['laptop', 'apple', 'macbook', 'pro', 'portable'],
    category: 'Laptops',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="13" rx="2"/><line x1="2" y1="18" x2="22" y2="18"/><path d="M8 18v1h8v-1"/><circle cx="12" cy="5" r="0.5" fill="currentColor"/></svg>`,
  },
  'macbook-air': {
    name: 'MacBook Air',
    tags: ['laptop', 'apple', 'macbook', 'air', 'thin', 'portable'],
    category: 'Laptops',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="11" rx="1.5"/><path d="M2 18l3-3h14l3 3"/><circle cx="12" cy="5.5" r="0.5" fill="currentColor"/></svg>`,
  },
  'imac': {
    name: 'iMac',
    tags: ['desktop', 'apple', 'monitor', 'all-in-one', 'screen'],
    category: 'Desktops',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="14" rx="2"/><line x1="2" y1="13" x2="22" y2="13"/><line x1="12" y1="16" x2="12" y2="19"/><path d="M8 19h8"/><circle cx="12" cy="14.5" r="0.5" fill="currentColor"/></svg>`,
  },
  'mac-mini': {
    name: 'Mac Mini',
    tags: ['desktop', 'apple', 'mini', 'compact', 'server'],
    category: 'Desktops',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="18" height="5" rx="2"/><circle cx="12" cy="12.5" r="0.5" fill="currentColor"/><line x1="6" y1="15" x2="6" y2="17"/><line x1="18" y1="15" x2="18" y2="17"/></svg>`,
  },
  'mac-studio': {
    name: 'Mac Studio',
    tags: ['desktop', 'apple', 'studio', 'workstation', 'pro'],
    category: 'Desktops',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="7" width="16" height="10" rx="2.5"/><circle cx="12" cy="12" r="1.5"/><line x1="7" y1="17" x2="7" y2="19"/><line x1="17" y1="17" x2="17" y2="19"/></svg>`,
  },
  'mac-pro': {
    name: 'Mac Pro',
    tags: ['desktop', 'apple', 'pro', 'tower', 'workstation'],
    category: 'Desktops',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="6" r="2.5"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="13.5" x2="16" y2="13.5"/><line x1="8" y1="16" x2="16" y2="16"/><line x1="8" y1="18.5" x2="16" y2="18.5"/></svg>`,
  },
  'iphone': {
    name: 'iPhone',
    tags: ['phone', 'apple', 'iphone', 'mobile', 'smartphone'],
    category: 'Phones',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="1" width="12" height="22" rx="3"/><line x1="9" y1="1.5" x2="15" y2="1.5"/><path d="M10.5 3h3" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  'ipad': {
    name: 'iPad',
    tags: ['tablet', 'apple', 'ipad', 'touch'],
    category: 'Tablets',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2" width="18" height="20" rx="2.5"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>`,
  },
  'ipad-pro': {
    name: 'iPad Pro',
    tags: ['tablet', 'apple', 'ipad', 'pro', 'pencil'],
    category: 'Tablets',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2" width="18" height="20" rx="2"/><line x1="3" y1="4" x2="21" y2="4"/><line x1="3" y1="20" x2="21" y2="20"/><circle cx="12" cy="2.5" r="0.4" fill="currentColor"/></svg>`,
  },
  'airpods': {
    name: 'AirPods',
    tags: ['audio', 'apple', 'airpods', 'earbuds', 'wireless'],
    category: 'Audio',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7a3 3 0 0 1 3 3v1a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7z"/><line x1="8.5" y1="12" x2="8.5" y2="17"/><path d="M17 7a3 3 0 0 0-3 3v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V7z"/><line x1="15.5" y1="12" x2="15.5" y2="17"/></svg>`,
  },
  'airpods-pro': {
    name: 'AirPods Pro',
    tags: ['audio', 'apple', 'airpods', 'pro', 'anc', 'noise-cancelling'],
    category: 'Audio',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6a3.5 3.5 0 0 1 3.5 3.5v1.5a1.5 1.5 0 0 1-1.5 1.5h-1A1.5 1.5 0 0 1 6 11V6.5z"/><path d="M7.5 12.5c0 1-.5 3-1 4.5"/><path d="M17.5 6a3.5 3.5 0 0 0-3.5 3.5v1.5a1.5 1.5 0 0 0 1.5 1.5h1A1.5 1.5 0 0 0 18 11V6.5z"/><path d="M16.5 12.5c0 1 .5 3 1 4.5"/></svg>`,
  },
  'airpods-max': {
    name: 'AirPods Max',
    tags: ['audio', 'apple', 'airpods', 'max', 'headphones', 'over-ear'],
    category: 'Audio',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12V9a8 8 0 0 1 16 0v3"/><rect x="2" y="12" width="5" height="7" rx="2"/><rect x="17" y="12" width="5" height="7" rx="2"/></svg>`,
  },
  'apple-watch': {
    name: 'Apple Watch',
    tags: ['wearable', 'apple', 'watch', 'smartwatch', 'fitness'],
    category: 'Wearables',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="5" width="10" height="14" rx="3"/><path d="M9 5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M9 19v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2"/><circle cx="12" cy="12" r="3"/></svg>`,
  },
  'apple-tv': {
    name: 'Apple TV',
    tags: ['streaming', 'apple', 'tv', 'media', 'entertainment'],
    category: 'Media',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="8" rx="2.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/><line x1="6" y1="16" x2="6" y2="18"/><line x1="18" y1="16" x2="18" y2="18"/></svg>`,
  },
  'homepod': {
    name: 'HomePod',
    tags: ['speaker', 'apple', 'homepod', 'smart-speaker', 'siri'],
    category: 'Audio',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v14a4 4 0 0 1-4 4 4 4 0 0 1-4-4V4z"/><circle cx="12" cy="15" r="2.5"/><line x1="12" y1="5" x2="12" y2="8"/></svg>`,
  },
  'magic-keyboard': {
    name: 'Magic Keyboard',
    tags: ['keyboard', 'apple', 'magic', 'input', 'typing'],
    category: 'Accessories',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="8" width="22" height="8" rx="2"/><rect x="4" y="10.5" width="2" height="1.5" rx="0.3"/><rect x="7.5" y="10.5" width="2" height="1.5" rx="0.3"/><rect x="11" y="10.5" width="2" height="1.5" rx="0.3"/><rect x="14.5" y="10.5" width="2" height="1.5" rx="0.3"/><rect x="18" y="10.5" width="2" height="1.5" rx="0.3"/><rect x="5.5" y="13" width="13" height="1.5" rx="0.3"/></svg>`,
  },
  'magic-mouse': {
    name: 'Magic Mouse',
    tags: ['mouse', 'apple', 'magic', 'input', 'pointing'],
    category: 'Accessories',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="16" rx="6"/><line x1="12" y1="4" x2="12" y2="10"/></svg>`,
  },
  'magic-trackpad': {
    name: 'Magic Trackpad',
    tags: ['trackpad', 'apple', 'magic', 'input', 'touch', 'gesture'],
    category: 'Accessories',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="16" x2="21" y2="16"/></svg>`,
  },
  'pro-display-xdr': {
    name: 'Pro Display XDR',
    tags: ['display', 'apple', 'monitor', 'pro', 'xdr', '6k', 'screen'],
    category: 'Displays',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="22" height="15" rx="1.5"/><line x1="12" y1="18" x2="12" y2="20"/><path d="M8 20h8"/><line x1="1" y1="15" x2="23" y2="15"/></svg>`,
  },
  'studio-display': {
    name: 'Studio Display',
    tags: ['display', 'apple', 'monitor', 'studio', '5k', 'screen'],
    category: 'Displays',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M9 17l-1 4h8l-1-4"/><circle cx="12" cy="4.5" r="0.5" fill="currentColor"/></svg>`,
  },
}

/** Get all Apple device icon entries as an array */
export const getAppleDeviceIconList = () =>
  Object.entries(APPLE_DEVICE_ICONS).map(([key, data]) => ({
    key,
    ...data,
  }))

/** Get Apple icon by key */
export const getAppleDeviceIcon = (key) => APPLE_DEVICE_ICONS[key] || null
