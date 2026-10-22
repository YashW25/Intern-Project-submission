'use client';

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { InternProfile } from '@/types';
import {
  generateCertificatePdfBlob,
  generateLorPdfBlob,
  generateLogbookPdfBlob,
  downloadCertificatePdf,
  downloadLorPdf,
  downloadLogbookPdf,
} from '@/lib/document-generator';
import {
  Users,
  Search,
  Download,
  FileText,
  FileCheck,
  ShieldCheck,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Mail,
  Calendar,
  Building,
  UserCheck,
  Award,
  Sparkles,
  Archive,
  Eye,
  Loader2,
  Printer,
  DownloadCloud,
  Check,
  Layers,
  ChevronRight,
  FolderArchive,
  FileBadge,
  BookOpen,
} from 'lucide-react';

interface InternsViewProps {
  interns: InternProfile[];
  onUpdateInternStatus?: (id: string, status: 'verified' | 'pending') => void;
}

type PreviewDocState = {
  type: 'certificate' | 'lor' | 'logbook';
  intern: InternProfile;
} | null;

export const InternsView: React.FC<InternsViewProps> = ({ interns, onUpdateInternStatus }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedIntern, setSelectedIntern] = useState<InternProfile | null>(null);
  const [previewDoc, setPreviewDoc] = useState<PreviewDocState>(null);
  const [logbookEntries, setLogbookEntries] = useState<any[]>([]);
  const [loadingLogbook, setLoadingLogbook] = useState(false);

  // Fetch real database entries whenever previewDoc changes to 'logbook'
  useEffect(() => {
    if (previewDoc?.type === 'logbook') {
      setLoadingLogbook(true);
      const url = `/api/logbooks?userId=${encodeURIComponent(previewDoc.intern.id)}&email=${encodeURIComponent(previewDoc.intern.email || '')}&name=${encodeURIComponent(previewDoc.intern.name || '')}`;
      fetch(url)
        .then((r) => r.json())
        .then((res) => {
          if (res?.logbooks && Array.isArray(res.logbooks)) {
            setLogbookEntries(res.logbooks);
          } else {
            setLogbookEntries([]);
          }
        })
        .catch((err) => {
          console.warn('Error fetching logbook entries:', err);
          setLogbookEntries([]);
        })
        .finally(() => setLoadingLogbook(false));
    } else {
      setLogbookEntries([]);
    }
  }, [previewDoc]);

  // Loading states for actions
  const [isZippingAllIssued, setIsZippingAllIssued] = useState(false);
  const [isZippingAllDocs, setIsZippingAllDocs] = useState(false);
  const [isZippingMaster, setIsZippingMaster] = useState(false);
  const [zippingInternId, setZippingInternId] = useState<string | null>(null);
  const [downloadingDocKey, setDownloadingDocKey] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Statistics
  const totalCount = interns.length;
  const verifiedCount = interns.filter((i) => i.documentVerificationStatus === 'verified').length;
  const ndaSignedCount = interns.filter((i) => i.ndaSigned).length;
  const withDocsCount = interns.filter(
    (i) => i.govIdLink || i.collegeIdLink || i.resumeLink || i.addressProofLink
  ).length;

  // Filtered list
  const filteredInterns = interns.filter((intern) => {
    const q = search.toLowerCase();
    const matchesSearch =
      intern.name.toLowerCase().includes(q) ||
      intern.email.toLowerCase().includes(q) ||
      intern.employeeCode.toLowerCase().includes(q) ||
      intern.department.toLowerCase().includes(q) ||
      (intern.phone && intern.phone.includes(q));

    if (!matchesSearch) return false;

    if (filterStatus === 'verified') return intern.documentVerificationStatus === 'verified';
    if (filterStatus === 'pending') return intern.documentVerificationStatus !== 'verified';
    if (filterStatus === 'nda') return intern.ndaSigned;
    return true;
  });

  // Helper: Format Certificate ID e.g. CERT/0595
  const getCertId = (intern: InternProfile) => {
    const rawNum = (intern.employeeCode || intern.id || '595').replace(/[^0-9]/g, '');
    return `CERT/${rawNum ? rawNum.slice(-4).padStart(4, '0') : '0595'}`;
  };

  // Helper: Download a single intern's issued documents only (Certificate PDF + LOR PDF + Dossier)
  const downloadSingleInternIssuedZip = async (intern: InternProfile) => {
    setZippingInternId(`issued_${intern.id}`);
    try {
      const zip = new JSZip();
      const folderName = `${intern.employeeCode}_${intern.name.replace(/\s+/g, '_')}_Issued_Documents`;
      const folder = zip.folder(folderName) || zip;

      // 1. Generate & Add Official Certificate PDF
      const certBlob = await generateCertificatePdfBlob(intern);
      folder.file(`Certificate_${intern.name.replace(/\s+/g, '_')}_Innovara.pdf`, certBlob);

      // 2. Generate & Add Official LOR PDF
      const lorBlob = await generateLorPdfBlob(intern);
      folder.file(`LOR_${intern.name.replace(/\s+/g, '_')}_Innovara.pdf`, lorBlob);

      // 3. Generate & Add Official Signed Logbook PDF
      try {
        const logbookBlob = await generateLogbookPdfBlob(intern);
        folder.file(`Logbook_${intern.name.replace(/\s+/g, '_')}_Innovara.pdf`, logbookBlob);
      } catch (e) {
        console.warn('Failed to embed logbook in issued ZIP:', e);
      }

      // 4. Add Official Issuance Record Dossier
      const certId = getCertId(intern);
      const dossierText = `=====================================================
INNOVARA DYNAMICS • OFFICIAL ISSUED DOCUMENTS REGISTER
=====================================================
Candidate Name:     ${intern.name}
Employee Code:      ${intern.employeeCode}
Department / Track: ${intern.department}
Internship Tenure:  ${intern.internshipPeriod || '1st July 2026 to 15th September 2026'}
Certificate Number: ${certId}
Certificate Date:   1st October 2026
LOR Reference:      REF: ID/LOR/2026/${certId.replace('CERT/', '')}
Official Logbook:   Logbook_${intern.name.replace(/\s+/g, '_')}_Innovara.pdf
Authorized By:      Snehal Dhumal, Head of Technical Directorate
Official Seal:      INNOVARA DYNAMICS PUNE SEAL (VERIFIED)
Issued Timestamp:   ${new Date().toLocaleString('en-US')}
=====================================================
`;
      folder.file('ISSUED_DOCUMENTS_DOSSIER.txt', dossierText);

      // Generate & Trigger Download
      const content = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${intern.employeeCode}_${intern.name.replace(/\s+/g, '_')}_Issued_Documents.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setActionSuccess(`Downloaded issued documents ZIP for ${intern.name}!`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Error generating issued ZIP:', err);
    } finally {
      setZippingInternId(null);
    }
  };

  // Helper: Download a single intern's complete documents as a ZIP (Both uploaded credentials & issued docs)
  const downloadSingleInternZip = async (intern: InternProfile) => {
    setZippingInternId(intern.id);
    try {
      const zip = new JSZip();
      const folderName = `${intern.employeeCode}_${intern.name.replace(/\s+/g, '_')}`;
      const folder = zip.folder(folderName) || zip;

      // 1. Generate & Embed Issued Certificate PDF
      try {
        const certBlob = await generateCertificatePdfBlob(intern);
        folder.file(`Official_Certificate_Completion.pdf`, certBlob);
      } catch (e) {
        console.warn('Failed to embed certificate in ZIP:', e);
      }

      // 2. Generate & Embed Issued LOR PDF
      try {
        const lorBlob = await generateLorPdfBlob(intern);
        folder.file(`Official_Letter_of_Recommendation.pdf`, lorBlob);
      } catch (e) {
        console.warn('Failed to embed LOR in ZIP:', e);
      }

      // 3. Generate & Embed Official Logbook PDF
      try {
        const logbookBlob = await generateLogbookPdfBlob(intern);
        folder.file(`Official_Logbook_Signed.pdf`, logbookBlob);
      } catch (e) {
        console.warn('Failed to embed logbook in ZIP:', e);
      }

      // 4. Text Summary
      const certId = getCertId(intern);
      const summaryText = `=====================================================
INNOVARA DYNAMICS • INTERN COMPLETE OFFICIAL DOSSIER
=====================================================
Employee Code:      ${intern.employeeCode}
Full Name:          ${intern.name}
Email Address:      ${intern.email}
Phone Number:       ${intern.phone || 'N/A'}
Department:         ${intern.department}
Internship Period:  ${intern.internshipPeriod}
Verification:       ${(intern.documentVerificationStatus || 'pending').toUpperCase()}
NDA Status:         ${intern.ndaSigned ? 'SIGNED & EXECUTED' : 'PENDING'}
Certificate Number: ${certId}
Certificate Date:   1st October 2026
Authorized By:      Snehal Dhumal, Innovara Dynamics
Signatory Seal:     INNOVARA DYNAMICS PUNE
Dossier Generated:  ${new Date().toLocaleString('en-US')}
=====================================================

SUBMITTED IDENTITY CREDENTIALS:
-----------------------------------------------------
1. Government ID:   ${intern.govIdLink || 'Not provided'}
2. College ID:      ${intern.collegeIdLink || 'Not provided'}
3. Address Proof:   ${intern.addressProofLink || 'Not provided'}
4. Resume/CV:       ${intern.resumeLink || 'Not provided'}
5. Digital Sig URL: ${intern.signaturePath || 'Not provided'}
=====================================================
`;
      folder.file('PROFILE_SUMMARY.txt', summaryText);

      // 5. HTML Document Portal
      const htmlManifest = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Official Dossier - ${intern.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 32px; }
    .card { max-width: 820px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h1 { margin-top: 0; color: #14b8a6; font-size: 26px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    .badge-verified { background: #064e3b; color: #34d399; }
    .badge-pending { background: #78350f; color: #fbbf24; }
    .meta { margin: 16px 0; color: #94a3b8; font-size: 13px; line-height: 1.6; }
    .section-title { font-size: 16px; font-weight: bold; margin-top: 24px; color: #38bdf8; border-bottom: 1px solid #1e293b; padding-bottom: 8px; }
    .doc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-top: 16px; }
    .doc-item { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px; }
    .doc-title { font-weight: bold; font-size: 14px; color: #f8fafc; margin-bottom: 4px; }
    .doc-desc { font-size: 11px; color: #94a3b8; margin: 0 0 10px; }
    .doc-link { display: inline-block; background: #0d9488; color: #fff; text-decoration: none; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: bold; }
    .doc-link:hover { background: #0f766e; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge ${intern.documentVerificationStatus === 'verified' ? 'badge-verified' : 'badge-pending'}">
      ${(intern.documentVerificationStatus || 'pending').toUpperCase()}
    </span>
    <h1>${intern.name} (${intern.employeeCode})</h1>
    <div class="meta">
      <strong>Company:</strong> Innovara Dynamics | <strong>Department:</strong> ${intern.department}<br>
      <strong>Tenure:</strong> ${intern.internshipPeriod}<br>
      <strong>Certificate ID:</strong> ${certId} | <strong>Issue Date:</strong> 1st October 2026<br>
      <strong>Authorized Signatory:</strong> Snehal Dhumal (Innovara Dynamics Pune)
    </div>

    <div class="section-title">🎓 Official Program Issued Documents</div>
    <div class="doc-grid">
      <div class="doc-item">
        <div class="doc-title">📜 Completion Certificate</div>
        <p class="doc-desc">Official landscape certificate with seal</p>
        <p style="font-size:11px;color:#cbd5e1;">Available in this ZIP archive as <strong>Official_Certificate_Completion.pdf</strong></p>
      </div>
      <div class="doc-item">
        <div class="doc-title">📄 Letter of Recommendation</div>
        <p class="doc-desc">Executive LOR on letterhead with Pune seal</p>
        <p style="font-size:11px;color:#cbd5e1;">Available in this ZIP archive as <strong>Official_Letter_of_Recommendation.pdf</strong></p>
      </div>
      <div class="doc-item">
        <div class="doc-title">📖 Official Signed Logbook</div>
        <p class="doc-desc">Verified daily engineering logs with Pune stamp</p>
        <p style="font-size:11px;color:#cbd5e1;">Available in this ZIP archive as <strong>Official_Logbook_Signed.pdf</strong></p>
      </div>
    </div>

    <div class="section-title">🗂️ Candidate Submitted Credentials</div>
    <div class="doc-grid">
      <div class="doc-item">
        <div class="doc-title">🪪 Government ID</div>
        <p class="doc-desc">Aadhar / Passport / Driver License</p>
        ${intern.govIdLink ? `<a href="${intern.govIdLink}" target="_blank" class="doc-link">Open Government ID &rarr;</a>` : '<span style="color:#64748b;font-size:12px;">Not Submitted</span>'}
      </div>
      <div class="doc-item">
        <div class="doc-title">🎓 College / University ID</div>
        <p class="doc-desc">Student ID Credential</p>
        ${intern.collegeIdLink ? `<a href="${intern.collegeIdLink}" target="_blank" class="doc-link">Open College ID &rarr;</a>` : '<span style="color:#64748b;font-size:12px;">Not Submitted</span>'}
      </div>
      <div class="doc-item">
        <div class="doc-title">🏠 Address Proof</div>
        <p class="doc-desc">Utility Bill / Rental Agreement</p>
        ${intern.addressProofLink ? `<a href="${intern.addressProofLink}" target="_blank" class="doc-link">Open Address Proof &rarr;</a>` : '<span style="color:#64748b;font-size:12px;">Not Submitted</span>'}
      </div>
      <div class="doc-item">
        <div class="doc-title">📄 Resume / CV</div>
        <p class="doc-desc">Candidate Curriculum Vitae</p>
        ${intern.resumeLink ? `<a href="${intern.resumeLink}" target="_blank" class="doc-link">Open Resume &rarr;</a>` : '<span style="color:#64748b;font-size:12px;">Not Submitted</span>'}
      </div>
    </div>
  </div>
</body>
</html>`;
      folder.file('DOSSIER_VIEWER.html', htmlManifest);

      // Generate & Trigger Download
      const content = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${intern.employeeCode}_${intern.name.replace(/\s+/g, '_')}_Complete_Dossier.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setActionSuccess(`Downloaded complete package for ${intern.name}!`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Error generating single intern ZIP:', err);
    } finally {
      setZippingInternId(null);
    }
  };

  // Helper: Download ALL issued documents for ALL interns as a master ZIP
  const downloadAllIssuedZip = async () => {
    setIsZippingAllIssued(true);
    try {
      const zip = new JSZip();

      // Master Register CSV
      let csvContent = 'Employee Code,Candidate Name,Department,Internship Period,Certificate Number,Issue Date,LOR Reference,Signatory,Official Seal\n';

      for (let i = 0; i < interns.length; i++) {
        const intern = interns[i];
        const certId = getCertId(intern);
        const refNo = `REF: ID/LOR/2026/${certId.replace('CERT/', '')}`;

        csvContent += `"${intern.employeeCode}","${intern.name}","${intern.department}","${intern.internshipPeriod}","${certId}","1st October 2026","${refNo}","Snehal Dhumal","INNOVARA DYNAMICS PUNE"\n`;

        const folderName = `${intern.employeeCode}_${intern.name.replace(/\s+/g, '_')}`;
        const folder = zip.folder(folderName);

        if (folder) {
          try {
            // Generate Certificate PDF Blob
            const certBlob = await generateCertificatePdfBlob(intern);
            folder.file(`Certificate_${intern.name.replace(/\s+/g, '_')}_Innovara.pdf`, certBlob);

            // Generate LOR PDF Blob
            const lorBlob = await generateLorPdfBlob(intern);
            folder.file(`LOR_${intern.name.replace(/\s+/g, '_')}_Innovara.pdf`, lorBlob);

            // Generate Logbook PDF Blob
            try {
              const logbookBlob = await generateLogbookPdfBlob(intern);
              folder.file(`Logbook_${intern.name.replace(/\s+/g, '_')}_Innovara.pdf`, logbookBlob);
            } catch (lbErr) {
              console.warn(`Could not add logbook for ${intern.name}:`, lbErr);
            }

            // Dossier summary
            const dossier = `INNOVARA DYNAMICS • OFFICIAL ISSUED DOCUMENTS
Candidate: ${intern.name} (${intern.employeeCode})
Department: ${intern.department}
Tenure: ${intern.internshipPeriod}
Certificate No: ${certId}
Date: 1st October 2026
Authorized: Snehal Dhumal (Innovara Dynamics Pune)
`;
            folder.file('ISSUANCE_SUMMARY.txt', dossier);
          } catch (itemErr) {
            console.warn(`Error generating issued docs for ${intern.name}:`, itemErr);
          }
        }
      }

      zip.file('ISSUED_DOCUMENTS_REGISTER.csv', csvContent);

      const content = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Innovara_Dynamics_All_Issued_Documents_${interns.length}_Interns.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setActionSuccess(`Successfully exported all issued documents for all ${interns.length} interns!`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error('Error generating master issued ZIP:', err);
    } finally {
      setIsZippingAllIssued(false);
    }
  };

  // Helper: Download ALL interns' uploaded credentials in a master ZIP
  const downloadAllInternsDocsZip = async () => {
    setIsZippingAllDocs(true);
    try {
      const zip = new JSZip();
      let csvContent = 'Employee Code,Full Name,Email,Phone,Department,Internship Period,Verification Status,NDA Signed,Government ID Link,College ID Link,Address Proof Link,Resume Link\n';

      for (const intern of interns) {
        csvContent += `"${intern.employeeCode}","${intern.name}","${intern.email}","${intern.phone || ''}","${intern.department}","${intern.internshipPeriod}","${intern.documentVerificationStatus || 'pending'}","${intern.ndaSigned ? 'YES' : 'NO'}","${intern.govIdLink || ''}","${intern.collegeIdLink || ''}","${intern.addressProofLink || ''}","${intern.resumeLink || ''}"\n`;

        const folderName = `${intern.employeeCode}_${intern.name.replace(/\s+/g, '_')}`;
        const folder = zip.folder(folderName);

        if (folder) {
          const internSummary = `INNOVARA DYNAMICS • CANDIDATE UPLOADED CREDENTIALS
Employee Code:    ${intern.employeeCode}
Full Name:        ${intern.name}
Email Address:    ${intern.email}
Phone:            ${intern.phone || 'N/A'}
Department:       ${intern.department}
Period:           ${intern.internshipPeriod}
Verification:     ${(intern.documentVerificationStatus || 'pending').toUpperCase()}
NDA Status:       ${intern.ndaSigned ? 'SIGNED' : 'PENDING'}

DOCUMENT LINKS:
1. Gov ID:        ${intern.govIdLink || 'Not provided'}
2. College ID:    ${intern.collegeIdLink || 'Not provided'}
3. Address Proof: ${intern.addressProofLink || 'Not provided'}
4. Resume/CV:     ${intern.resumeLink || 'Not provided'}
`;
          folder.file('CREDENTIALS_SUMMARY.txt', internSummary);
        }
      }

      zip.file('INTERN_CREDENTIALS_REGISTER.csv', csvContent);

      const content = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Innovara_Dynamics_All_Uploaded_Credentials_${interns.length}_Interns.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setActionSuccess(`Exported uploaded credentials archive for all ${interns.length} interns!`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error('Error generating master credentials ZIP:', err);
    } finally {
      setIsZippingAllDocs(false);
    }
  };

  // Helper: Download complete master archive (Both uploaded credentials AND issued documents)
  const downloadMasterAllInOneZip = async () => {
    setIsZippingMaster(true);
    try {
      const zip = new JSZip();
      let masterCsv = 'Employee Code,Candidate Name,Email,Department,Tenure,Certificate ID,Issue Date,Gov ID,College ID,Address,Resume,Status\n';

      for (const intern of interns) {
        const certId = getCertId(intern);
        masterCsv += `"${intern.employeeCode}","${intern.name}","${intern.email}","${intern.department}","${intern.internshipPeriod}","${certId}","1st October 2026","${intern.govIdLink || ''}","${intern.collegeIdLink || ''}","${intern.addressProofLink || ''}","${intern.resumeLink || ''}","${intern.documentVerificationStatus || 'pending'}"\n`;

        const folderName = `${intern.employeeCode}_${intern.name.replace(/\s+/g, '_')}`;
        const folder = zip.folder(folderName);

        if (folder) {
          // Generate Certificate
          try {
            const certBlob = await generateCertificatePdfBlob(intern);
            folder.file(`Certificate_${intern.name.replace(/\s+/g, '_')}_Innovara.pdf`, certBlob);
          } catch {}

          // Generate LOR
          try {
            const lorBlob = await generateLorPdfBlob(intern);
            folder.file(`LOR_${intern.name.replace(/\s+/g, '_')}_Innovara.pdf`, lorBlob);
          } catch {}

          // Generate Logbook
          try {
            const logbookBlob = await generateLogbookPdfBlob(intern);
            folder.file(`Logbook_${intern.name.replace(/\s+/g, '_')}_Innovara.pdf`, logbookBlob);
          } catch {}

          // Summary
          const dossier = `INNOVARA DYNAMICS • COMPLETE MASTER DOSSIER
Candidate:    ${intern.name} (${intern.employeeCode})
Department:   ${intern.department}
Tenure:       ${intern.internshipPeriod}
Certificate:  ${certId} (1st October 2026)
Signatory:    Snehal Dhumal, Innovara Dynamics Pune
Gov ID:       ${intern.govIdLink || 'N/A'}
College ID:   ${intern.collegeIdLink || 'N/A'}
Address:      ${intern.addressProofLink || 'N/A'}
Resume:       ${intern.resumeLink || 'N/A'}
`;
          folder.file('COMPLETE_DOSSIER.txt', dossier);
        }
      }

      zip.file('COMPLETE_MASTER_REGISTER.csv', masterCsv);

      const content = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Innovara_Dynamics_Complete_Master_Archive_All_Docs.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setActionSuccess(`Exported Complete Master Archive (Issued Documents + Credentials)!`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error('Error generating complete master ZIP:', err);
    } finally {
      setIsZippingMaster(false);
    }
  };

  // Helper: Toggle Verification Status
  const handleToggleVerification = async (intern: InternProfile) => {
    const newStatus = intern.documentVerificationStatus === 'verified' ? 'pending' : 'verified';
    if (onUpdateInternStatus) {
      onUpdateInternStatus(intern.id, newStatus);
    }

    try {
      await fetch('/api/interns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: intern.id, verificationStatus: newStatus }),
      });
      setActionSuccess(`Updated verification status for ${intern.name} to ${newStatus.toUpperCase()}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e) {
      console.error('Failed to update verification status:', e);
    }
  };

  // Individual Document Download Handler
  const handleDownloadDoc = async (type: 'certificate' | 'lor' | 'logbook', intern: InternProfile) => {
    const key = `${type}_${intern.id}`;
    setDownloadingDocKey(key);
    try {
      if (type === 'certificate') {
        await downloadCertificatePdf(intern);
      } else if (type === 'lor') {
        await downloadLorPdf(intern);
      } else if (type === 'logbook') {
        await downloadLogbookPdf(intern);
      }
      const label = type === 'certificate' ? 'Certificate' : type === 'lor' ? 'LOR' : 'Official Logbook';
      setActionSuccess(`Downloaded ${label} for ${intern.name}!`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e) {
      console.error(`Error downloading ${type}:`, e);
    } finally {
      setDownloadingDocKey(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-950/70 via-slate-900 to-slate-900 border border-teal-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold px-3 py-1 rounded-full">
              <Users className="w-3.5 h-3.5 text-teal-400" />
              Interns Directory & Document Repository
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Intern Profiles & Official Documents
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Inspect candidate profiles, view and download official issued documents (Completion Certificates & LORs), access uploaded identity credentials, or export bulk ZIP packages.
            </p>
          </div>

          {/* Master Bulk Download Actions */}
          <div className="shrink-0 flex flex-wrap items-center gap-3">
            {/* 1. Download All Issued Documents ZIP */}
            <button
              onClick={downloadAllIssuedZip}
              disabled={isZippingAllIssued || interns.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-teal-600/20 transition cursor-pointer disabled:opacity-50"
              title="Download ZIP of all official completion certificates and LORs for all interns"
            >
              {isZippingAllIssued ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Archiving Issued Docs...</span>
                </>
              ) : (
                <>
                  <Award className="w-4 h-4 text-teal-200" />
                  <span>Download All Issued Docs (ZIP)</span>
                </>
              )}
            </button>

            {/* 2. Download All Uploaded Credentials ZIP */}
            <button
              onClick={downloadAllInternsDocsZip}
              disabled={isZippingAllDocs || interns.length === 0}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
              title="Download ZIP of uploaded credentials (Gov ID, Resume, College ID)"
            >
              {isZippingAllDocs ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Archiving Credentials...</span>
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 text-indigo-400" />
                  <span>Uploaded Credentials (ZIP)</span>
                </>
              )}
            </button>

            {/* 3. Download Master All-in-One ZIP */}
            <button
              onClick={downloadMasterAllInOneZip}
              disabled={isZippingMaster || interns.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
              title="Download complete archive of everything (Issued Docs + Uploaded Credentials)"
            >
              {isZippingMaster ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Archiving Master Package...</span>
                </>
              ) : (
                <>
                  <FolderArchive className="w-4 h-4 text-purple-200" />
                  <span>Master All-in-One (ZIP)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-950/70 border border-emerald-700 text-emerald-200 text-xs p-3.5 rounded-xl flex items-center gap-2 animate-fadeIn shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Interns</p>
          <p className="text-2xl font-extrabold text-white mt-1">{totalCount}</p>
          <span className="text-[10px] text-slate-500">Registered candidates</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Docs Verified</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{verifiedCount}</p>
          <span className="text-[10px] text-emerald-500/80">Approved records</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">NDA Signed</p>
          <p className="text-2xl font-extrabold text-cyan-400 mt-1">{ndaSignedCount}</p>
          <span className="text-[10px] text-cyan-500/80">Executed agreements</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Official Docs Issued</p>
          <p className="text-2xl font-extrabold text-teal-400 mt-1">{totalCount}</p>
          <span className="text-[10px] text-teal-400/80">Certificates & LORs Ready</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, employee code, or phone..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition whitespace-nowrap ${
              filterStatus === 'all'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Interns ({totalCount})
          </button>
          <button
            onClick={() => setFilterStatus('verified')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition whitespace-nowrap ${
              filterStatus === 'verified'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Verified ({verifiedCount})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition whitespace-nowrap ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Pending ({totalCount - verifiedCount})
          </button>
          <button
            onClick={() => setFilterStatus('nda')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition whitespace-nowrap ${
              filterStatus === 'nda'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            NDA Signed ({ndaSignedCount})
          </button>
        </div>
      </div>

      {/* Interns Table / Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">Candidate</th>
                <th className="py-4 px-6">Department & Cohort</th>
                <th className="py-4 px-6">Verification</th>
                <th className="py-4 px-6">Issued Documents</th>
                <th className="py-4 px-6">Available Credentials</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {filteredInterns.map((intern) => {
                const certId = getCertId(intern);
                const isDownloadingCert = downloadingDocKey === `certificate_${intern.id}`;
                const isDownloadingLor = downloadingDocKey === `lor_${intern.id}`;
                const isDownloadingLogbook = downloadingDocKey === `logbook_${intern.id}`;

                return (
                  <tr key={intern.id} className="hover:bg-slate-850/50 transition">
                    {/* Candidate Profile */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={intern.avatarUrl}
                          alt={intern.name}
                          className="w-10 h-10 rounded-xl bg-slate-800 object-cover border border-slate-700 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white text-sm">{intern.name}</p>
                            <span className="font-mono text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 px-2 py-0.5 rounded-md font-semibold">
                              {intern.employeeCode}
                            </span>
                          </div>
                          <p className="text-slate-400 text-xs mt-0.5">{intern.email}</p>
                          {intern.phone && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              {intern.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Department & Cohort */}
                    <td className="py-4 px-6">
                      <p className="font-semibold text-slate-200">{intern.department}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {intern.internshipPeriod}
                      </p>
                    </td>

                    {/* Verification Status */}
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleToggleVerification(intern)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                          intern.documentVerificationStatus === 'verified'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900/60'
                            : 'bg-amber-950/60 text-amber-300 border-amber-700/80 hover:bg-amber-900/60'
                        }`}
                        title="Click to toggle verification status"
                      >
                        {intern.documentVerificationStatus === 'verified' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Verified</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Pending</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* NEW: ISSUED DOCUMENTS (View / Download Certificate, LOR, Logbook) */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1.5">
                        {/* Certificate Button */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreviewDoc({ type: 'certificate', intern })}
                            className="inline-flex items-center gap-1.5 bg-teal-950/70 hover:bg-teal-900/80 text-teal-300 border border-teal-700/80 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
                            title="View official completion certificate preview"
                          >
                            <Award className="w-3 h-3 text-teal-400" />
                            <span>Cert ({certId})</span>
                          </button>

                          <button
                            onClick={() => handleDownloadDoc('certificate', intern)}
                            disabled={isDownloadingCert}
                            className="p-1 hover:bg-slate-800 text-teal-400 hover:text-teal-300 rounded-md transition cursor-pointer disabled:opacity-40"
                            title="Download Certificate PDF"
                          >
                            {isDownloadingCert ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* LOR Button */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreviewDoc({ type: 'lor', intern })}
                            className="inline-flex items-center gap-1.5 bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/80 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
                            title="View official Letter of Recommendation preview"
                          >
                            <FileText className="w-3 h-3 text-indigo-400" />
                            <span>LOR (Official)</span>
                          </button>

                          <button
                            onClick={() => handleDownloadDoc('lor', intern)}
                            disabled={isDownloadingLor}
                            className="p-1 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded-md transition cursor-pointer disabled:opacity-40"
                            title="Download LOR PDF"
                          >
                            {isDownloadingLor ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Logbook Button */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreviewDoc({ type: 'logbook', intern })}
                            className="inline-flex items-center gap-1.5 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/80 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
                            title="View official verified logbook preview"
                          >
                            <BookOpen className="w-3 h-3 text-emerald-400" />
                            <span>Logbook (Signed)</span>
                          </button>

                          <button
                            onClick={() => handleDownloadDoc('logbook', intern)}
                            disabled={isDownloadingLogbook}
                            className="p-1 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 rounded-md transition cursor-pointer disabled:opacity-40"
                            title="Download Signed Logbook PDF"
                          >
                            {isDownloadingLogbook ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Available Credentials Pills */}
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                        {intern.govIdLink && (
                          <a
                            href={intern.govIdLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-lg text-[10px] font-medium transition"
                            title="View Government ID"
                          >
                            <span>Gov ID</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}

                        {intern.collegeIdLink && (
                          <a
                            href={intern.collegeIdLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-lg text-[10px] font-medium transition"
                            title="View College ID"
                          >
                            <span>College ID</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}

                        {intern.resumeLink && (
                          <a
                            href={intern.resumeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-lg text-[10px] font-medium transition"
                            title="View Resume"
                          >
                            <span>Resume</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}

                        {intern.addressProofLink && (
                          <a
                            href={intern.addressProofLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-lg text-[10px] font-medium transition"
                            title="View Address Proof"
                          >
                            <span>Address</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}

                        {intern.signaturePath && (
                          <a
                            href={intern.signaturePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800 text-indigo-300 px-2 py-0.5 rounded-lg text-[10px] font-medium transition"
                            title="View Digital Signature"
                          >
                            <span>Sig</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}

                        {!intern.govIdLink &&
                          !intern.collegeIdLink &&
                          !intern.resumeLink &&
                          !intern.addressProofLink && (
                            <span className="text-[11px] text-slate-500">None uploaded</span>
                          )}
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedIntern(intern)}
                          className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition"
                          title="Inspect complete intern profile and document dossier"
                        >
                          <Eye className="w-3.5 h-3.5 text-teal-400" />
                          <span>Inspect</span>
                        </button>

                        {/* Download Single Intern's Issued Docs ZIP */}
                        <button
                          onClick={() => downloadSingleInternIssuedZip(intern)}
                          disabled={zippingInternId === `issued_${intern.id}`}
                          className="inline-flex items-center gap-1.5 bg-teal-950/80 hover:bg-teal-900 border border-teal-700/80 text-teal-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                          title="Download ZIP containing issued Certificate & LOR for this intern"
                        >
                          {zippingInternId === `issued_${intern.id}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Award className="w-3.5 h-3.5 text-teal-400" />
                          )}
                          <span>Issued ZIP</span>
                        </button>

                        {/* Download Complete Package ZIP */}
                        <button
                          onClick={() => downloadSingleInternZip(intern)}
                          disabled={zippingInternId === intern.id}
                          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer transition disabled:opacity-50"
                          title="Download complete ZIP package (Credentials + Issued Certificate & LOR)"
                        >
                          {zippingInternId === intern.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>Docs ZIP</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredInterns.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No interns found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DOCUMENT PREVIEW MODAL (Certificate or LOR) */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl space-y-6 relative overflow-hidden max-h-[92vh] overflow-y-auto">
            {/* Ambient Top Glow */}
            <div className="bg-gradient-to-r from-teal-500 via-indigo-500 to-purple-500 h-1.5 absolute top-0 left-0 right-0" />

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 bg-teal-950 text-teal-300 border border-teal-800 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {previewDoc.type === 'certificate'
                    ? 'Official Completion Certificate'
                    : previewDoc.type === 'lor'
                    ? 'Official Letter of Recommendation'
                    : 'Official Verified Logbook'}
                </span>
                <h3 className="text-xl font-extrabold text-white mt-1">
                  {previewDoc.intern.name} ({previewDoc.intern.employeeCode})
                </h3>
              </div>

              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Render Canvas Preview */}
            {previewDoc.type === 'certificate' ? (
              <div className="flex justify-center p-2 bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto">
                <div
                  style={{
                    width: '100%',
                    maxWidth: '780px',
                    aspectRatio: '1.414 / 1',
                    position: 'relative',
                    backgroundColor: '#ffffff',
                  }}
                  className="rounded-xl shadow-2xl overflow-hidden select-none border border-slate-300"
                >
                  {/* Background Frame Image */}
                  <div
                    className="absolute inset-0 w-full h-full pointer-events-none select-none"
                    style={{
                      backgroundImage: `url('/certificate/innovara_certificate_frame.png')`,
                      backgroundSize: '100% 100%',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                  />

                  {/* Title */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '10%',
                      top: '13.5%',
                      width: '80%',
                      textAlign: 'center',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: '#1e293b',
                      letterSpacing: '1px',
                    }}
                  >
                    CERTIFICATE OF COMPLETION
                  </div>

                  {/* Subtitle */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '10%',
                      top: '22%',
                      width: '80%',
                      textAlign: 'center',
                      fontSize: '13px',
                      color: '#475569',
                    }}
                  >
                    This certificate is awarded to
                  </div>

                  {/* Candidate Name */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '10%',
                      top: '31%',
                      width: '80%',
                      textAlign: 'center',
                      fontSize: '34px',
                      fontWeight: 'bold',
                      color: '#14b8a6',
                    }}
                  >
                    {previewDoc.intern.name}
                  </div>

                  {/* Paragraph 1 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '10%',
                      top: '43.5%',
                      width: '80%',
                      textAlign: 'center',
                      fontSize: '11.5px',
                      color: '#334155',
                    }}
                  >
                    has successfully completed an internship at Innovara Dynamics from{' '}
                    {previewDoc.intern.internshipPeriod || '1st July 2026 to 15th September 2026'}.
                  </div>

                  {/* Paragraph 2 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '14%',
                      top: '50.5%',
                      width: '72%',
                      textAlign: 'center',
                      fontSize: '10.5px',
                      color: '#475569',
                      lineHeight: '1.5',
                    }}
                  >
                    During this internship, the intern gained practical experience and contributed to various tasks in the domain of{' '}
                    {previewDoc.intern.department || 'Web Development'}. The intern demonstrated strong technical skills, problem-solving abilities, willingness to learn, and dedication throughout the internship period.
                  </div>

                  {/* Paragraph 3 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '14%',
                      top: '62.5%',
                      width: '72%',
                      textAlign: 'center',
                      fontSize: '10.5px',
                      color: '#475569',
                      lineHeight: '1.5',
                    }}
                  >
                    We appreciate their valuable contribution and commitment during the internship and wish them success in their future endeavors.
                  </div>

                  {/* Official Snehal Dhumal Signature & Innovara Dynamics Pune Seal Block */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '41.3%',
                      top: '67.3%',
                      width: '27.2%',
                      pointerEvents: 'none',
                    }}
                  >
                    <img
                      src="/certificate/innovara_signature_seal_block.png"
                      alt="Signature & Seal"
                      className="w-full h-auto object-contain"
                    />
                  </div>

                  {/* Footer Metadata */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '34.5%',
                      top: '85.5%',
                      width: '15%',
                      textAlign: 'left',
                      fontSize: '10.5px',
                      fontWeight: 'bold',
                      color: '#1e293b',
                    }}
                  >
                    Certificate No:-
                    <br />
                    <span style={{ color: '#0d9488' }}>{getCertId(previewDoc.intern)}</span>
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      left: '50.5%',
                      top: '85.5%',
                      width: '20%',
                      textAlign: 'left',
                      fontSize: '10.5px',
                      fontWeight: 'bold',
                      color: '#1e293b',
                    }}
                  >
                    Issue Date:-
                    <br />
                    <span style={{ color: '#0d9488' }}>1st October 2026</span>
                  </div>
                </div>
              </div>
            ) : previewDoc.type === 'lor' ? (
              /* Official Letterhead LOR Preview */
              <div className="flex justify-center p-2 bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto">
                <div
                  style={{
                    width: '100%',
                    maxWidth: '650px',
                    aspectRatio: '1 / 1.414',
                    position: 'relative',
                    backgroundColor: '#ffffff',
                    backgroundImage: `url('/certificate/innovara_letterhead_bg.png')`,
                    backgroundSize: '100% 100%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                  className="rounded-xl shadow-2xl select-none text-slate-800"
                >
                  {/* Reference Number */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '17.4%',
                      top: '19.2%',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: '#1e293b',
                    }}
                  >
                    INVD26/LOR/{getCertId(previewDoc.intern).replace('CERT/', '')}
                  </div>

                  {/* Date */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '66.2%',
                      top: '19.2%',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: '#1e293b',
                    }}
                  >
                    1st October 2026
                  </div>

                  {/* Recommendation Text Body */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '9.5%',
                      top: '26.2%',
                      width: '81%',
                      fontSize: '10px',
                      lineHeight: '1.5',
                      color: '#1e293b',
                    }}
                    className="space-y-2"
                  >
                    <p className="font-bold text-slate-900 text-[11px]">TO WHOM IT MAY CONCERN,</p>
                    <p>
                      It is our distinct pleasure to recommend <strong>{previewDoc.intern.name}</strong> ({previewDoc.intern.employeeCode}), who completed an internship tenure with Innovara Dynamics from {previewDoc.intern.internshipPeriod || '1st July 2026 to 15th September 2026'} in the domain of {previewDoc.intern.department || 'Web Development'}.
                    </p>
                    <p>
                      Throughout the internship tenure, {previewDoc.intern.name} demonstrated outstanding problem-solving intellect, engineering aptitude, and dedication. They exhibited proactive ownership of deliverables, collaborated productively across cross-functional sprints, and produced high-quality technical outcomes that contributed meaningfully to real-world engineering objectives.
                    </p>
                    <p>
                      Beyond their technical competencies, {previewDoc.intern.name} displayed commendable communication habits, peer empathy, intellectual curiosity, and high professional integrity. They consistently welcomed technical feedback and adopted industry-standard coding practices with commendable speed.
                    </p>
                    <p>
                      We hold unwavering confidence that {previewDoc.intern.name} will serve as a high-caliber asset to any engineering organization or academic pursuit they choose to undertake. We extend our highest endorsement and wish them continued success in their career.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Logbook Preview */
              <div className="flex justify-center p-2 bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto">
                <div
                  style={{
                    width: '100%',
                    maxWidth: '650px',
                    position: 'relative',
                    backgroundColor: '#ffffff',
                    padding: '36px',
                  }}
                  className="rounded-xl shadow-2xl select-none text-slate-800 text-xs leading-relaxed space-y-4"
                >
                  {/* Top Letterhead Header */}
                  <div className="border-b-2 border-teal-800 pb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-black text-slate-900 tracking-wider">INNOVARA DYNAMICS</h4>
                      <p className="text-[10px] text-teal-700 font-semibold uppercase">Directorate of Engineering & Technology</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-500">
                      <p>Pune, Maharashtra, India</p>
                      <p>support@innovara.in</p>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center py-1">
                    <h3 className="font-extrabold text-base text-slate-900 tracking-wide">
                      INTERNSHIP OFFICIAL LOGBOOK
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 tracking-wider">
                      INNOVARA DYNAMICS • VERIFIED ENGINEERING RECORD
                    </p>
                  </div>

                  {/* Candidate Profile Details Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500">Intern Name: </span>
                      <strong className="text-slate-900">{previewDoc.intern.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Department: </span>
                      <strong className="text-slate-900">{previewDoc.intern.department}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Tenure: </span>
                      <strong className="text-slate-900">{previewDoc.intern.internshipPeriod}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Database Records: </span>
                      <strong className="text-emerald-700">
                        {loadingLogbook
                          ? 'Fetching from Database...'
                          : `${logbookEntries.length} verified records • ${logbookEntries
                              .reduce((s, e) => s + (Number(e.hoursSpent) || 0), 0)
                              .toFixed(1)} hrs`}
                      </strong>
                    </div>
                  </div>

                  {/* Real Database Log Table Preview */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-[10px]">
                    <div className="bg-slate-900 text-white font-bold py-2.5 px-3 grid grid-cols-12 gap-2">
                      <span className="col-span-3">DATE</span>
                      <span className="col-span-7">TITLE & WORK DESCRIPTION</span>
                      <span className="col-span-2 text-right">HOURS</span>
                    </div>

                    {loadingLogbook ? (
                      <div className="py-10 text-center text-slate-500 flex items-center justify-center gap-2 bg-slate-50">
                        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                        <span>Fetching authentic engineering records from database...</span>
                      </div>
                    ) : logbookEntries.length === 0 ? (
                      <div className="py-10 text-center text-slate-500 italic bg-slate-50">
                        No logbook records found in the database for this intern.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                        {logbookEntries.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className={`p-2.5 grid grid-cols-12 gap-2 ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                            }`}
                          >
                            <span className="col-span-3 font-semibold text-slate-600">
                              {item.date
                                ? new Date(item.date).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : `Day ${idx + 1}`}
                            </span>
                            <div className="col-span-7 text-slate-800">
                              <p className="font-bold text-slate-900 text-[10.5px]">{item.title}</p>
                              {item.description && (
                                <p className="text-slate-600 text-[9.5px] mt-0.5 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                              {item.whatLearned && (
                                <p className="text-teal-700 text-[9px] mt-0.5 italic">
                                  Learnings: {item.whatLearned}
                                </p>
                              )}
                            </div>
                            <span className="col-span-2 text-right font-bold text-teal-700">
                              {(Number(item.hoursSpent) || 0).toFixed(1)} hrs
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Signatures & Seal Block */}
                  <div className="pt-4 border-t border-slate-200 flex items-end justify-between">
                    <div>
                      <img src="/certificate/snehal_dhumal_sig.png" alt="Signature" className="h-10 object-contain mb-1" />
                      <p className="font-bold text-slate-900 text-xs">Snehal Dhumal</p>
                      <p className="text-[10px] text-slate-500">Program Director & Signoff Authority<br />Innovara Dynamics, Pune</p>
                    </div>
                    <img src="/certificate/innovara_pune_stamp.png" alt="Pune Stamp" className="w-16 h-16 object-contain" />
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 cursor-pointer transition"
              >
                Close
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadDoc(previewDoc.type, previewDoc.intern)}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-teal-600/30 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download High-Res PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. INTERN DOSSIER INSPECTOR MODAL */}
      {/* ========================================================================= */}
      {selectedIntern && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 relative overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Ambient Glow */}
            <div className="bg-gradient-to-r from-teal-500 via-indigo-500 to-purple-500 h-1.5 absolute top-0 left-0 right-0" />

            {/* Close Button */}
            <button
              onClick={() => setSelectedIntern(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4">
              <img
                src={selectedIntern.avatarUrl}
                alt={selectedIntern.name}
                className="w-16 h-16 rounded-2xl bg-slate-800 object-cover border border-slate-700 shadow-md"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-white">{selectedIntern.name}</h3>
                  <span className="font-mono text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-2.5 py-0.5 rounded-md font-bold">
                    {selectedIntern.employeeCode}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-0.5">{selectedIntern.email}</p>
                <p className="text-xs text-teal-400 font-semibold mt-0.5">
                  {selectedIntern.department} • {selectedIntern.internshipPeriod}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
              <div>
                <p className="text-slate-500 font-semibold uppercase text-[10px]">Contact Phone</p>
                <p className="text-slate-200 mt-0.5">{selectedIntern.phone || 'Not recorded'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold uppercase text-[10px]">Emergency Contact</p>
                <p className="text-slate-200 mt-0.5">{selectedIntern.emergencyContact || 'Not recorded'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold uppercase text-[10px]">Document Verification</p>
                <p className="mt-0.5">
                  <span
                    className={`font-bold capitalize ${
                      selectedIntern.documentVerificationStatus === 'verified'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {selectedIntern.documentVerificationStatus || 'Pending Review'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold uppercase text-[10px]">NDA Execution</p>
                <p className="text-slate-200 mt-0.5">
                  {selectedIntern.ndaSigned ? (
                    <span className="text-cyan-400 font-bold">Signed & Active</span>
                  ) : (
                    <span className="text-slate-500">Pending Execution</span>
                  )}
                </p>
              </div>
              {selectedIntern.skills && selectedIntern.skills.length > 0 && (
                <div className="sm:col-span-2 pt-2 border-t border-slate-800">
                  <p className="text-slate-500 font-semibold uppercase text-[10px] mb-1">Declared Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedIntern.skills.map((s, idx) => (
                      <span key={idx} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md text-[10px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* NEW: Official Program Issued Documents Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-teal-400" />
                Official Program Issued Documents
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Completion Certificate Card */}
                <div className="p-3.5 bg-slate-950 border border-teal-800/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-xs">Completion Certificate</p>
                      <p className="text-[10px] text-teal-300 font-mono">{getCertId(selectedIntern)}</p>
                    </div>
                    <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded font-bold">
                      Issued
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        const intern = selectedIntern;
                        setSelectedIntern(null);
                        setPreviewDoc({ type: 'certificate', intern });
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold py-1.5 px-2.5 rounded-lg text-center transition cursor-pointer"
                    >
                      View Preview
                    </button>
                    <button
                      onClick={() => handleDownloadDoc('certificate', selectedIntern)}
                      className="flex-1 bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold py-1.5 px-2.5 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>

                {/* Letter of Recommendation Card */}
                <div className="p-3.5 bg-slate-950 border border-indigo-800/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-xs">Letter of Recommendation</p>
                      <p className="text-[10px] text-indigo-300 font-mono">Official Letterhead</p>
                    </div>
                    <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-bold">
                      Signed
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        const intern = selectedIntern;
                        setSelectedIntern(null);
                        setPreviewDoc({ type: 'lor', intern });
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold py-1.5 px-2.5 rounded-lg text-center transition cursor-pointer"
                    >
                      View Preview
                    </button>
                    <button
                      onClick={() => handleDownloadDoc('lor', selectedIntern)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold py-1.5 px-2.5 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>

                {/* Official Signed Logbook Card */}
                <div className="p-3.5 bg-slate-950 border border-emerald-800/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-xs">Official Signed Logbook</p>
                      <p className="text-[10px] text-emerald-300 font-mono">Pune Directorate Seal</p>
                    </div>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                      Signed
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        const intern = selectedIntern;
                        setSelectedIntern(null);
                        setPreviewDoc({ type: 'logbook', intern });
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold py-1.5 px-2.5 rounded-lg text-center transition cursor-pointer"
                    >
                      View Preview
                    </button>
                    <button
                      onClick={() => handleDownloadDoc('logbook', selectedIntern)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold py-1.5 px-2.5 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Submitted Identity & Academic Credentials */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Submitted Identity & Academic Credentials
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Gov ID */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-200 text-xs">Government ID</p>
                    <p className="text-[10px] text-slate-500">Identity verification</p>
                  </div>
                  {selectedIntern.govIdLink ? (
                    <a
                      href={selectedIntern.govIdLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 transition"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-600">Not provided</span>
                  )}
                </div>

                {/* College ID */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-200 text-xs">College ID</p>
                    <p className="text-[10px] text-slate-500">Student enrollment</p>
                  </div>
                  {selectedIntern.collegeIdLink ? (
                    <a
                      href={selectedIntern.collegeIdLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 transition"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-600">Not provided</span>
                  )}
                </div>

                {/* Address Proof */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-200 text-xs">Address Proof</p>
                    <p className="text-[10px] text-slate-500">Residential credential</p>
                  </div>
                  {selectedIntern.addressProofLink ? (
                    <a
                      href={selectedIntern.addressProofLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 transition"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-600">Not provided</span>
                  )}
                </div>

                {/* Resume */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-200 text-xs">Resume / CV</p>
                    <p className="text-[10px] text-slate-500">Technical portfolio</p>
                  </div>
                  {selectedIntern.resumeLink ? (
                    <a
                      href={selectedIntern.resumeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 transition"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-600">Not provided</span>
                  )}
                </div>
              </div>

              {/* Digital Signature */}
              {selectedIntern.signaturePath && (
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-200 text-xs">Authorized Candidate Signature</p>
                    <p className="text-[10px] text-slate-500">Captured during enrollment NDA</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedIntern.signaturePath}
                      alt="Signature"
                      className="h-9 max-w-28 object-contain bg-white/10 rounded px-1.5 py-0.5 filter invert"
                    />
                    <a
                      href={selectedIntern.signaturePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg"
                    >
                      View Full
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
              <button
                onClick={() => handleToggleVerification(selectedIntern)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  selectedIntern.documentVerificationStatus === 'verified'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-800 hover:bg-amber-900'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                }`}
              >
                {selectedIntern.documentVerificationStatus === 'verified'
                  ? 'Mark as Pending'
                  : 'Approve & Verify Credentials'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadSingleInternIssuedZip(selectedIntern)}
                  disabled={zippingInternId === `issued_${selectedIntern.id}`}
                  className="flex items-center gap-1.5 bg-teal-950 hover:bg-teal-900 border border-teal-700 text-teal-300 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer disabled:opacity-50"
                  title="Download Certificate & LOR only"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Issued Docs (ZIP)</span>
                </button>

                <button
                  onClick={() => downloadSingleInternZip(selectedIntern)}
                  disabled={zippingInternId === selectedIntern.id}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
                  title="Download All Documents (Credentials + Issued Docs)"
                >
                  {zippingInternId === selectedIntern.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>All Docs (ZIP)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
