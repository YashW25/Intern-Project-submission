export type UserRole = 'intern' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  internshipPeriod: string;
  avatarUrl?: string;
  status: 'active' | 'completed' | 'pending';
}

export interface CodeFile {
  path: string;
  name: string;
  content: string;
  language: string;
  size: number;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  language?: string;
}

export interface ProjectSubmission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  projectTitle: string;
  description: string;
  zipFileId: string;
  zipFileName: string;
  fileTree: FileTreeNode[];
  files: CodeFile[];
  status: 'submitted' | 'under_review' | 'approved' | 'revision_requested';
  grade?: string;
  feedback?: string;
  submittedAt: string;
}

export interface LogbookEntry {
  id: string;
  userId: string;
  userName: string;
  date: string;           // ISO date string
  title: string;          // entry title / what was done
  description: string;    // detailed description
  hoursSpent: number;     // hours logged that day
  whatLearned: string;    // what_learned from DB
  driveLink?: string;     // optional drive link
  userSignature?: string | null; // signature_path from DB
  createdAt: string;
  updatedAt: string;
}

export interface TextBlockPosition {
  id: string;
  label: string;
  text: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  fontSize: number; // in px
  fontWeight: 'normal' | 'bold' | '500' | '600' | '700';
  color: string;
  textAlign: 'left' | 'center' | 'right';
  maxWidth: number; // percentage (0 - 100)
}

export interface LorData {
  id: string;
  userId: string;
  userEmail?: string;
  userName: string;
  department: string;
  internshipPeriod: string;
  letterheadBgUrl?: string;
  blocks: TextBlockPosition[];
  status: 'draft' | 'issued';
  issuedAt?: string;
  issuedBy?: string;
}

export interface ContactMessage {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'replied';
  reply?: string;
  createdAt: string;
}

export interface PortalNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  createdAt: string;
}

export interface InternProfile {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  internshipPeriod: string;
  govIdLink?: string | null;
  collegeIdLink?: string | null;
  addressProofLink?: string | null;
  resumeLink?: string | null;
  signaturePath?: string | null;
  documentVerificationStatus?: 'verified' | 'pending' | 'rejected' | null;
  ndaSigned?: boolean;
  ndaSignedAt?: string | null;
  skills?: string[] | null;
  emergencyContact?: string | null;
  status: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface CertificateData {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  department: string;
  internshipPeriod: string;
  certificateNumber: string;
  theme: 'innovara_official' | 'executive_dark' | 'classic_gold' | 'cyber_emerald' | 'minimal_light';
  blocks: TextBlockPosition[];
  status: 'draft' | 'issued';
  issuedAt?: string;
  issuedBy?: string;
  directorSignatureUrl?: string;
  sealText?: string;
  backgroundImageUrl?: string;
  signatureSealBlockUrl?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  stampUrl?: string;
}

