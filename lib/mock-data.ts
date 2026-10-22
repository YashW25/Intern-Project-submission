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
    letterheadBgUrl: '/certificate/innovara_letterhead_bg.png',
    status: 'draft',
    blocks: [
      {
        id: 'block_date',
        label: 'Date',
        text: currentDate,
        x: 65.3,
        y: 19.4,
        fontSize: 13,
        fontWeight: 'bold',
        color: '#1e293b',
        textAlign: 'left',
        maxWidth: 30,
      },
      {
        id: 'block_ref',
        label: 'Reference Number',
        text: 'INVD26/LOR/5578',
        x: 17.4,
        y: 19.5,
        fontSize: 13,
        fontWeight: 'bold',
        color: '#1e293b',
        textAlign: 'left',
        maxWidth: 35,
      },
      {
        id: 'block_body',
        label: 'Recommendation Body',
        text: `To Whom It May Concern,\n\nI am pleased to recommend {name_full}, who successfully completed an internship at Innovara Dynamics as a {role}.\n\nDuring their time with Innovara Dynamics, {name} demonstrated a strong sense of responsibility, willingness to learn, and commitment towards assigned responsibilities.\n\nOne of the qualities that stood out was their ability to adapt to new challenges and work effectively in a dynamic environment. {name} showed initiative in understanding assigned tasks, seeking solutions to problems, and completing responsibilities within the expected timelines. They were also receptive to feedback and demonstrated continuous improvement throughout the internship.\n\nIn addition to their technical/professional abilities, {name} maintained a positive attitude and worked well with other team members. Their communication, teamwork, and willingness to take ownership of their work made them a valuable member of the internship team.\n\nTheir efforts contributed positively to the overall progress of the project.\n\nBased on their performance during the internship, I believe {name} has the potential to grow and succeed in their future academic and professional endeavors. I am confident that the knowledge, experience, and professional exposure gained at Innovara Dynamics will serve them well in their future career.\n\nI therefore recommend {name} for future academic opportunities, internships, employment, and other professional endeavors.\n\nI wish them all the very best for their future.`,
        x: 7.9,
        y: 26.0,
        fontSize: 12.5,
        fontWeight: 'normal',
        color: '#1e293b',
        textAlign: 'left',
        maxWidth: 84,
      },
    ],
  };
}

export const INITIAL_LOR: LorData = getDefaultLorTemplate();
