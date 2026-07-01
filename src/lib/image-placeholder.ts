// Local placeholder for product images. Used as the src fallback when
// product.image_url is empty. Inline SVG → zero network, immune to
// CSP / blocked CDNs (we used to hit via.placeholder.com which got
// ERR_CONNECTION_CLOSED in some networks and froze the service
// worker on the failed fetch).
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#1e2a3a"/>
  <g fill="#475569" font-family="system-ui,sans-serif" text-anchor="middle">
    <text x="200" y="160" font-size="14">No image</text>
  </g>
</svg>`

export const NO_IMAGE_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(SVG)}`
