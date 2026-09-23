import { User, ProjectSubmission, LogbookEntry, LorData, ContactMessage, PortalNotification } from '@/types';
import { getCompanyLetterheadSvgUrl } from './letterhead';

export const INITIAL_USERS: User[] = [];

export const INITIAL_SUBMISSIONS: ProjectSubmission[] = [];

export const INITIAL_LOGBOOKS: LogbookEntry[] = [];

export const INITIAL_CONTACT_MESSAGES: ContactMessage[] = [];

export const INITIAL_NOTIFICATIONS: PortalNotification[] = [];

/**
 * Creates a clean, production-ready LOR layout template for a given intern.
 */
export function getDefaultLorTemplate(
  userName: string = 'Intern Name',
  department: string = 'Software Engineering',
  internshipPeriod: string = 'Active Cohort'
): LorData {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    id: `lor_${Date.now()}`,
    userId: 'usr_active',
    userName,
    department,
    internshipPeriod,
    letterheadBgUrl: getCompanyLetterheadSvgUrl(),
    status: 'draft',
    blocks: [
      {
        id: 'ref_no',
        label: 'Ref & Date',
        text: `REF: POS/LOR/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}                                              Date: ${currentDate}`,
        x: 8,
        y: 16,
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
        textAlign: 'left',
        maxWidth: 84
      },
      {
        id: 'header_title',
        label: 'Document Title',
        text: 'LETTER OF RECOMMENDATION',
        x: 8,
        y: 21,
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1e1b4b',
        textAlign: 'center',
        maxWidth: 84
      },
      {
        id: 'salutation',
        label: 'Salutation',
        text: 'TO WHOM IT MAY CONCERN,',
        x: 8,
        y: 27,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#334155',
        textAlign: 'left',
        maxWidth: 84
      },
      {
        id: 'body_para1',
        label: 'Paragraph 1',
        text: `This letter is to certify that ${userName} has successfully completed their intensive Internship Program at PeopleOS Technologies in the ${department} department during the period of ${internshipPeriod}.`,
        x: 8,
        y: 31,
        fontSize: 13,
        fontWeight: 'normal',
        color: '#1e293b',
        textAlign: 'left',
        maxWidth: 84
      },
      {
        id: 'body_para2',
        label: 'Paragraph 2',
        text: `During their tenure, ${userName} demonstrated strong technical problem-solving capabilities, active participation in engineering tasks, and dedication to software quality standards.`,
        x: 8,
        y: 40,
        fontSize: 13,
        fontWeight: 'normal',
        color: '#1e293b',
        textAlign: 'left',
        maxWidth: 84
      },
      {
        id: 'body_para3',
        label: 'Paragraph 3',
        text: `We commend ${userName} for their commitment and performance throughout the program and recommend them for future software engineering opportunities.`,
        x: 8,
        y: 54,
        fontSize: 13,
        fontWeight: 'normal',
        color: '#1e293b',
        textAlign: 'left',
        maxWidth: 84
      },
      {
        id: 'signoff',
        label: 'Sign-off',
        text: 'Sincerely,',
        x: 8,
        y: 64,
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
        textAlign: 'left',
        maxWidth: 84
      },
      {
        id: 'signature_block',
        label: 'Signature Block',
        text: 'Program Director\nHead of Engineering & Relations\nPeopleOS Technologies Inc.',
        x: 8,
        y: 69,
        fontSize: 12,
        fontWeight: '600',
        color: '#0f172a',
        textAlign: 'left',
        maxWidth: 50
      }
    ]
  };
}

export const INITIAL_LOR: LorData = getDefaultLorTemplate();
