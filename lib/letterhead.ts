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

export const OFFICIAL_INNOVARA_LETTERHEAD = '/certificate/innovara_letterhead_bg.png';

/**
 * Returns the official company letterhead background image URL
 */
export function getCompanyLetterheadSvgUrl(config = DEFAULT_LETTERHEAD_CONFIG): string {
  // Always return the official high-resolution Innovara Dynamics letterhead
  return OFFICIAL_INNOVARA_LETTERHEAD;
}

