export interface LetterheadConfig {
  companyName: string;
  tagline: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  primaryColor: string;
  accentColor: string;
  logoSvg?: string;
}

export const DEFAULT_LETTERHEAD_CONFIG: LetterheadConfig = {
  companyName: "PEOPLE OS TECHNOLOGIES",
  tagline: "Empowering Next-Generation Software Engineering",
  address: "Innovation Park, Building 4, Tech Corridor, SF 94107",
  email: "internships@peopleos.tech",
  phone: "+1 (800) 555-0199",
  website: "www.peopleos.tech",
  primaryColor: "#4f46e5",
  accentColor: "#06b6d4",
};

/**
 * Returns a high quality SVG Data URL of the company letterhead
 */
export function getCompanyLetterheadSvgUrl(config = DEFAULT_LETTERHEAD_CONFIG): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1130" width="800" height="1130">
    <defs>
      <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e1b4b" />
        <stop offset="50%" stop-color="#312e81" />
        <stop offset="100%" stop-color="#4338ca" />
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#06b6d4" />
        <stop offset="50%" stop-color="#3b82f6" />
        <stop offset="100%" stop-color="#6366f1" />
      </linearGradient>
      <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e7ff" stroke-width="0.5" opacity="0.3"/>
      </pattern>
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.1"/>
      </filter>
    </defs>

    <!-- Page Background -->
    <rect width="800" height="1130" fill="#ffffff" />
    <rect width="800" height="1130" fill="url(#gridPattern)" />

    <!-- Top Geometric Banner -->
    <path d="M 0 0 L 800 0 L 800 130 L 680 150 L 0 100 Z" fill="url(#headerGrad)" />
    <path d="M 0 100 L 680 150 L 800 130 L 800 142 L 0 112 Z" fill="url(#accentGrad)" />

    <!-- Company Logo & Header Text -->
    <g transform="translate(45, 30)">
      <!-- Modern Logo Badge -->
      <rect x="0" y="0" width="54" height="54" rx="14" fill="#ffffff" filter="url(#shadow)" />
      <path d="M 15 15 L 39 15 L 39 39 L 27 39 Z" fill="url(#accentGrad)" />
      <path d="M 15 23 L 27 23 L 27 39 L 15 39 Z" fill="#4338ca" opacity="0.8" />
      <circle cx="27" cy="27" r="4" fill="#ffffff" />

      <text x="72" y="28" font-family="'Inter', sans-serif" font-weight="800" font-size="22" fill="#ffffff" letter-spacing="1">
        ${config.companyName}
      </text>
      <text x="72" y="46" font-family="'Inter', sans-serif" font-weight="500" font-size="11" fill="#c7d2fe" letter-spacing="0.5">
        ${config.tagline.toUpperCase()}
      </text>
    </g>

    <!-- Header Right Details -->
    <g transform="translate(560, 35)">
      <text x="195" y="15" text-anchor="end" font-family="'Inter', sans-serif" font-weight="600" font-size="10" fill="#ffffff" letter-spacing="0.5">OFFICIAL DOCUMENT</text>
      <text x="195" y="32" text-anchor="end" font-family="'Inter', sans-serif" font-weight="400" font-size="10" fill="#e0e7ff">${config.email}</text>
      <text x="195" y="47" text-anchor="end" font-family="'Inter', sans-serif" font-weight="400" font-size="10" fill="#e0e7ff">${config.website}</text>
    </g>

    <!-- Central Watermark Logo -->
    <g transform="translate(400, 565)" opacity="0.04">
      <circle cx="0" cy="0" r="180" fill="none" stroke="#4338ca" stroke-width="8" />
      <path d="M -80 -80 L 80 -80 L 80 80 L 0 80 Z" fill="#4338ca" />
    </g>

    <!-- Footer Decorative Line -->
    <path d="M 40 1060 L 760 1060" stroke="url(#accentGrad)" stroke-width="2" />

    <!-- Footer Info -->
    <g transform="translate(40, 1080)">
      <text x="0" y="0" font-family="'Inter', sans-serif" font-weight="500" font-size="9" fill="#64748b">
        ${config.address}
      </text>
      <text x="0" y="14" font-family="'Inter', sans-serif" font-weight="400" font-size="9" fill="#94a3b8">
        Phone: ${config.phone} | Support: ${config.email}
      </text>

      <text x="720" y="0" text-anchor="end" font-family="'Inter', sans-serif" font-weight="700" font-size="9" fill="#4f46e5">
        VERIFIED CERTIFICATE PORTAL
      </text>
      <text x="720" y="14" text-anchor="end" font-family="'Inter', sans-serif" font-weight="400" font-size="8" fill="#94a3b8">
        Document Security Hash: POS-${Date.now().toString(36).toUpperCase()}
      </text>
    </g>
  </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
