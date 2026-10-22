import { CertificateData, TextBlockPosition } from '@/types';

export const DEFAULT_CERTIFICATE_BLOCKS: TextBlockPosition[] = [
  {
    id: 'cert_title',
    label: 'Certificate Title',
    text: 'CERTIFICATE OF COMPLETION',
    x: 10,
    y: 13.5,
    fontSize: 27,
    fontWeight: 'bold',
    color: '#1e293b', // Slate 800
    textAlign: 'center',
    maxWidth: 80,
  },
  {
    id: 'cert_presentation',
    label: 'Presentation Line',
    text: 'This certificate is awarded to',
    x: 10,
    y: 22,
    fontSize: 13,
    fontWeight: 'normal',
    color: '#475569', // Slate 600
    textAlign: 'center',
    maxWidth: 80,
  },
  {
    id: 'cert_name',
    label: 'Candidate Full Name',
    text: '{name_full}',
    x: 10,
    y: 31,
    fontSize: 38,
    fontWeight: 'bold',
    color: '#14b8a6', // Vibrant Teal
    textAlign: 'center',
    maxWidth: 80,
  },
  {
    id: 'cert_body_1',
    label: 'Completion Period Line',
    text: 'has successfully completed an internship at Innovara Dynamics from {internship_period}.',
    x: 10,
    y: 43.5,
    fontSize: 12,
    fontWeight: 'normal',
    color: '#334155', // Slate 700
    textAlign: 'center',
    maxWidth: 80,
  },
  {
    id: 'cert_body_2',
    label: 'Domain & Skills Paragraph',
    text: 'During this internship, the intern gained practical experience and contributed to various tasks in the domain of {department}. The intern demonstrated strong technical skills, problem-solving abilities, willingness to learn, and dedication throughout the internship period.',
    x: 14,
    y: 50.5,
    fontSize: 11,
    fontWeight: 'normal',
    color: '#475569', // Slate 600
    textAlign: 'center',
    maxWidth: 72,
  },
  {
    id: 'cert_body_3',
    label: 'Appreciation Paragraph',
    text: 'We appreciate their valuable contribution and commitment during the internship and wish them success in their future endeavors.',
    x: 14,
    y: 62.5,
    fontSize: 11,
    fontWeight: 'normal',
    color: '#475569', // Slate 600
    textAlign: 'center',
    maxWidth: 72,
  },
  {
    id: 'cert_meta_no',
    label: 'Certificate Number',
    text: 'Certificate No:-\n{certificate_id}',
    x: 34.5,
    y: 85.5,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'left',
    maxWidth: 16,
  },
  {
    id: 'cert_meta_date',
    label: 'Issue Date',
    text: 'Issue Date:-\n{issue_date}',
    x: 50.5,
    y: 85.5,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'left',
    maxWidth: 22,
  },
];

export const INITIAL_CERTIFICATE: CertificateData = {
  id: 'cert_template_innovara_official',
  userId: 'usr_default',
  userName: 'Jeenisha Bhutekar',
  department: 'Web Development',
  internshipPeriod: '1st July 2026 to 15th September 2026',
  certificateNumber: 'CERT/0595',
  theme: 'innovara_official',
  blocks: DEFAULT_CERTIFICATE_BLOCKS,
  status: 'issued',
  issuedAt: '2026-10-01T00:00:00.000Z',
  issuedBy: 'Snehal Dhumal, Innovara Dynamics',
  signatoryName: 'Snehal Dhumal',
  signatoryTitle: 'Innovara Dynamics',
  signatureSealBlockUrl: '/certificate/innovara_signature_seal_block.png',
  directorSignatureUrl: '/certificate/snehal_dhumal_sig.png',
  stampUrl: '/certificate/innovara_pune_stamp.png',
  backgroundImageUrl: '/certificate/innovara_certificate_frame.png',
  sealText: 'INNOVARA DYNAMICS PUNE',
};

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatOfficialDate(d: Date = new Date()): string {
  const day = getOrdinal(d.getDate());
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function replaceCertificatePlaceholders(
  text: string,
  intern: {
    id?: string;
    name?: string;
    employeeCode?: string;
    department?: string;
    internshipPeriod?: string;
    certificateNumber?: string;
  }
): string {
  if (!text) return '';
  const fullName = intern.name || 'Jeenisha Bhutekar';
  const firstName = fullName.split(' ')[0] || 'Intern';
  const dept = intern.department || 'Web Development';
  const period = intern.internshipPeriod || '1st July 2026 to 15th September 2026';
  
  // Format Certificate Number like CERT/0595
  let certId = intern.certificateNumber;
  if (!certId) {
    const rawNum = (intern.employeeCode || intern.id || '595').replace(/[^0-9]/g, '');
    const num = rawNum ? rawNum.slice(-4).padStart(4, '0') : '0595';
    certId = `CERT/${num}`;
  }

  const currentDate = '1st October 2026';

  return text
    .replace(/\{name_full\}/g, fullName)
    .replace(/\{name\}/g, firstName)
    .replace(/\{role\}/g, dept)
    .replace(/\{department\}/g, dept)
    .replace(/\{internship_period\}/g, period)
    .replace(/\{certificate_id\}/g, certId)
    .replace(/\{certificate_number\}/g, certId)
    .replace(/\{issue_date\}/g, currentDate)
    .replace(/\{download_date\}/g, currentDate)
    .replace(/\{company_name\}/g, 'Innovara Dynamics');
}
