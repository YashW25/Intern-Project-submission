import jsPDF from 'jspdf';
import { InternProfile } from '@/types';
import { getCompanyLetterheadSvgUrl } from './letterhead';

/**
 * Loads an image from a URL into an HTMLImageElement
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image at ${url}: ${e}`));
    img.src = url;
  });
}

/**
 * Generates an off-screen HTMLCanvasElement rendering the official Innovara Dynamics certificate
 */
export async function generateCertificateCanvas(
  intern: InternProfile,
  scale: number = 2
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const width = 919 * scale;
  const height = 657 * scale;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Fill white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 1. Draw Background Frame
  try {
    const frameImg = await loadImage('/certificate/innovara_certificate_frame.png');
    ctx.drawImage(frameImg, 0, 0, width, height);
  } catch (e) {
    console.warn('Frame image load failed, drawing fallback background:', e);
  }

  // 2. Draw Title: CERTIFICATE OF COMPLETION
  ctx.fillStyle = '#1e293b';
  ctx.font = `bold ${26 * scale}px Arial, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('CERTIFICATE OF COMPLETION', width / 2, 100 * scale);

  // 3. Draw Subtitle: This certificate is awarded to
  ctx.fillStyle = '#475569';
  ctx.font = `normal ${13 * scale}px Arial, -apple-system, sans-serif`;
  ctx.fillText('This certificate is awarded to', width / 2, 155 * scale);

  // 4. Draw Candidate Name (Vibrant Teal)
  ctx.fillStyle = '#14b8a6';
  ctx.font = `bold ${38 * scale}px Arial, -apple-system, sans-serif`;
  ctx.fillText(intern.name, width / 2, 230 * scale);

  // 5. Draw Paragraph 1
  const period = intern.internshipPeriod || '1st July 2026 to 15th September 2026';
  ctx.fillStyle = '#334155';
  ctx.font = `normal ${12 * scale}px Arial, -apple-system, sans-serif`;
  ctx.fillText(
    `has successfully completed an internship at Innovara Dynamics from ${period}.`,
    width / 2,
    292 * scale
  );

  // 6. Draw Paragraph 2
  const dept = intern.department || 'Web Development';
  ctx.fillStyle = '#475569';
  ctx.font = `normal ${11 * scale}px Arial, -apple-system, sans-serif`;
  ctx.fillText(
    'During this internship, the intern gained practical experience and contributed to various tasks in the domain of',
    width / 2,
    335 * scale
  );
  ctx.fillText(
    `${dept}. The intern demonstrated strong technical skills, problem-solving abilities, willingness to learn,`,
    width / 2,
    350 * scale
  );
  ctx.fillText(
    'and dedication throughout the internship period.',
    width / 2,
    365 * scale
  );

  // 7. Draw Paragraph 3
  ctx.fillText(
    'We appreciate their valuable contribution and commitment during the internship and wish them success in their',
    width / 2,
    412 * scale
  );
  ctx.fillText('future endeavors.', width / 2, 427 * scale);

  // 8. Draw Official Snehal Dhumal Signature & Innovara Dynamics Pune Seal Block
  try {
    const sigImg = await loadImage('/certificate/innovara_signature_seal_block.png');
    ctx.drawImage(sigImg, 380 * scale, 442 * scale, 250 * scale, 103 * scale);
  } catch (e) {
    console.warn('Signature block load failed:', e);
  }

  // 9. Draw Certificate Number & Issue Date
  const rawNum = (intern.employeeCode || intern.id || '595').replace(/[^0-9]/g, '');
  const certId = `CERT/${rawNum ? rawNum.slice(-4).padStart(4, '0') : '0595'}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1e293b';
  ctx.font = `bold ${11 * scale}px Arial, -apple-system, sans-serif`;
  ctx.fillText('Certificate No:-', 320 * scale, 565 * scale);
  ctx.fillStyle = '#0d9488';
  ctx.fillText(certId, 320 * scale, 582 * scale);

  ctx.fillStyle = '#1e293b';
  ctx.fillText('Issue Date:-', 460 * scale, 565 * scale);
  ctx.fillStyle = '#0d9488';
  ctx.fillText('1st October 2026', 460 * scale, 582 * scale);

  return canvas;
}

/**
 * Generates an official Certificate PDF Blob for a given intern
 */
export async function generateCertificatePdfBlob(intern: InternProfile): Promise<Blob> {
  const canvas = await generateCertificateCanvas(intern, 2);
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
  return pdf.output('blob');
}

/**
 * Generates an official Letter of Recommendation (LOR) PDF Blob for a given intern
 */
export async function generateLorPdfBlob(intern: InternProfile): Promise<Blob> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const width = pdf.internal.pageSize.getWidth(); // 210mm
  const height = pdf.internal.pageSize.getHeight(); // 297mm

  // 1. Draw Official Innovara Dynamics Letterhead Background
  try {
    const letterheadImg = await loadImage('/certificate/innovara_letterhead_bg.png');
    pdf.addImage(letterheadImg, 'PNG', 0, 0, width, height, undefined, 'FAST');
  } catch (e) {
    console.warn('Letterhead image load failed:', e);
  }

  // 2. Reference & Date
  const rawNum = (intern.employeeCode || intern.id || '595').replace(/[^0-9]/g, '');
  const refNum = rawNum ? rawNum.slice(-4).padStart(4, '0') : '0595';
  const refNo = `INVD26/LOR/${refNum}`;
  const currentDate = '1st October 2026';

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(20, 20, 20);

  // Position next to pre-printed "REF NO. : "
  pdf.text(refNo, 36.5, 57.5);

  // Position next to pre-printed "DATE: "
  pdf.text(currentDate, 139, 57.5);

  // 3. Salutation (under pre-printed gold title "LETTER OF RECOMMENDATION")
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(30, 41, 59);
  pdf.text('TO WHOM IT MAY CONCERN,', 20, 78);

  // 4. Body Paragraphs (formatted cleanly between y = 86mm and y = 205mm)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.8);
  pdf.setTextColor(30, 41, 59);

  const textWidth = width - 40; // 170mm width

  const p1 = `It is our distinct pleasure to recommend ${intern.name} (${intern.employeeCode}), who completed an internship tenure with Innovara Dynamics from ${intern.internshipPeriod || '1st July 2026 to 15th September 2026'} in the domain of ${intern.department || 'Web Development'}.`;
  const splitP1 = pdf.splitTextToSize(p1, textWidth);
  pdf.text(splitP1, 20, 86);

  const p2 = `Throughout the internship tenure, ${intern.name} demonstrated outstanding problem-solving intellect, engineering aptitude, and dedication. They exhibited proactive ownership of deliverables, collaborated productively across cross-functional sprints, and produced high-quality technical outcomes that contributed meaningfully to real-world engineering objectives.`;
  const splitP2 = pdf.splitTextToSize(p2, textWidth);
  pdf.text(splitP2, 20, 112);

  const p3 = `Beyond their technical competencies, ${intern.name} displayed commendable communication habits, peer empathy, intellectual curiosity, and high professional integrity. They consistently welcomed technical feedback and adopted industry-standard coding practices with commendable speed.`;
  const splitP3 = pdf.splitTextToSize(p3, textWidth);
  pdf.text(splitP3, 20, 142);

  const p4 = `We hold unwavering confidence that ${intern.name} will serve as a high-caliber asset to any engineering organization or academic pursuit they choose to undertake. We extend our highest endorsement and wish them continued success in their career.`;
  const splitP4 = pdf.splitTextToSize(p4, textWidth);
  pdf.text(splitP4, 20, 172);

  // Note: Official CEO Signature (Gaurav Kumar Singh) and Innovara Dynamics Pune seal
  // are already pre-printed on the authentic letterhead background between y = 215mm and y = 265mm.
  // The official national accreditation logos strip (MSME, AICTE, Skill India, etc.) is at y = 268mm - 297mm.

  return pdf.output('blob');
}

/**
 * Generates an official Signed Logbook PDF Blob for a given intern
 */
export async function generateLogbookPdfBlob(
  intern: InternProfile,
  customEntries?: any[]
): Promise<Blob> {
  let entries = customEntries;

  // If no entries provided, fetch authentic records from /api/logbooks
  if (!entries || entries.length === 0) {
    try {
      const url = `/api/logbooks?userId=${encodeURIComponent(intern.id)}&email=${encodeURIComponent(intern.email || '')}&name=${encodeURIComponent(intern.name || '')}`;
      const res = await fetch(url).then((r) => r.json());
      if (res?.logbooks && Array.isArray(res.logbooks)) {
        entries = res.logbooks;
      }
    } catch (e) {
      console.warn('Could not fetch logbooks from API:', e);
    }
  }

  // Ensure entries is always an authentic array - no fake entries
  if (!entries) {
    entries = [];
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const contentWidth = 182;
  const totalHours = entries.reduce((s: number, e: any) => s + (e.hoursSpent || 8), 0);

  let currentPage = 1;

  const renderHeader = () => {
    pdf.setFillColor(15, 23, 42); // Slate 950
    pdf.rect(0, 0, pageWidth, 22, 'F');
    pdf.setFillColor(13, 148, 136); // Teal 600
    pdf.rect(0, 22, pageWidth, 1.2, 'F');

    // Innovara Logo / Badge
    pdf.setFillColor(20, 184, 166);
    pdf.roundedRect(14, 4, 11, 11, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text('ID', 19.5, 12, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('INNOVARA DYNAMICS', 28, 9);

    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(153, 246, 228);
    pdf.text('DIRECTORATE OF ENGINEERING & TECHNOLOGY', 28, 14.5);

    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('OFFICIAL LOGBOOK RECORD', 196, 8, { align: 'right' });

    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(204, 251, 241);
    pdf.text('support@innovara.in', 196, 12.5, { align: 'right' });
    pdf.text('www.innovara.in', 196, 16.5, { align: 'right' });
  };

  const renderFooter = (page: number, totalPages: number) => {
    pdf.setPage(page);
    pdf.setFillColor(13, 148, 136);
    pdf.rect(14, 283, contentWidth, 0.5, 'F');

    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text('Innovara Dynamics • Verified Engineering Record | Pune, Maharashtra, India', 14, 287);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(13, 148, 136);
    pdf.text(`VERIFIED PORTAL  |  Page ${page} of ${totalPages}`, 196, 287, { align: 'right' });
  };

  const renderTableHeader = (y: number) => {
    pdf.setFillColor(15, 23, 42);
    pdf.rect(14, y, contentWidth, 8, 'F');

    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);

    pdf.text('DATE', 16, y + 5.5);
    pdf.text('TITLE & WORK DONE', 38, y + 5.5);
    pdf.text('KEY LEARNINGS', 128, y + 5.5);
    pdf.text('HOURS', 188, y + 5.5, { align: 'center' });

    return y + 8;
  };

  renderHeader();

  // Title Box
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('INTERNSHIP OFFICIAL LOGBOOK', 105, 31, { align: 'center' });

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 116, 139);
  pdf.text('INNOVARA DYNAMICS • VERIFIED ENGINEERING RECORD', 105, 35, { align: 'center' });

  // Intern Info Card
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(14, 38, contentWidth, 16, 2, 2, 'FD');

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);

  pdf.text('Intern Name:', 18, 43.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(intern.name, 36, 43.5);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text('Department:', 105, 43.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(intern.department || 'Web Development', 123, 43.5);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text('Internship Period:', 18, 49.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(intern.internshipPeriod || '1st July 2026 to 15th September 2026', 43, 49.5);

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text('Total Entries:', 105, 49.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(`${entries.length} logged records • ${totalHours.toFixed(1)} hrs`, 123, 49.5);

  let currentY = renderTableHeader(58);

  // Render Rows - All authentic database entries without artificial limits
  if (entries.length === 0) {
    pdf.setFillColor(248, 250, 252);
    pdf.rect(14, currentY, contentWidth, 22, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(14, currentY, contentWidth, 22, 'S');

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 116, 139);
    pdf.text('No recorded logbook entries found in database for candidate.', 105, currentY + 12, { align: 'center' });
    currentY += 26;
  } else {
    for (let i = 0; i < entries.length; i++) {
      const item = entries[i];
      const isEven = i % 2 === 0;

      const dateStr = item.date
        ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : `Day ${i + 1}`;

      const titleText = `${item.title || 'Technical Deliverable'}\n${item.description || ''}`;
      const splitTitle = pdf.splitTextToSize(titleText, 88);
      const splitLearning = pdf.splitTextToSize(item.whatLearned || 'Demonstrated technical discipline.', 56);

      const rowHeight = Math.max(splitTitle.length * 3.5, splitLearning.length * 3.5, 9) + 4;

      // Check page overflow
      if (currentY + rowHeight > 240) {
        currentPage++;
        pdf.addPage();
        renderHeader();
        currentY = renderTableHeader(30);
      }

      if (isEven) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(14, currentY, contentWidth, rowHeight, 'F');
      }

      pdf.setDrawColor(241, 245, 249);
      pdf.line(14, currentY + rowHeight, 14 + contentWidth, currentY + rowHeight);

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(71, 85, 105);
      pdf.text(dateStr, 16, currentY + 4.5);

      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(splitTitle[0] || '', 38, currentY + 4.5);

      if (splitTitle.length > 1) {
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        pdf.text(splitTitle.slice(1), 38, currentY + 8);
      }

      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      pdf.text(splitLearning, 128, currentY + 4.5);

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(13, 148, 136);
      pdf.text(`${(item.hoursSpent || 0).toFixed(1)} hrs`, 188, currentY + 4.5, { align: 'center' });

      currentY += rowHeight;
    }
  }

  // Signatures on Last Page
  if (currentY + 36 > 275) {
    currentPage++;
    pdf.addPage();
    renderHeader();
    currentY = 40;
  }

  currentY += 8;

  // Signatures container
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(14, currentY, contentWidth, 28, 2, 2, 'FD');

  // Director Signature
  try {
    const sigImg = await loadImage('/certificate/snehal_dhumal_sig.png');
    pdf.addImage(sigImg, 'PNG', 20, currentY + 2, 36, 14);
  } catch {}

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Snehal Dhumal', 20, currentY + 20);

  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text('Program Director & Signoff Authority\nInnovara Dynamics, Pune', 20, currentY + 23.5);

  // Pune Stamp
  try {
    const stampImg = await loadImage('/certificate/innovara_pune_stamp.png');
    pdf.addImage(stampImg, 'PNG', 150, currentY + 2, 24, 24);
  } catch {}

  // Apply page footers
  const totalPages = currentPage;
  for (let p = 1; p <= totalPages; p++) {
    renderFooter(p, totalPages);
  }

  return pdf.output('blob');
}

/**
 * Triggers direct download of the official Certificate PDF
 */
export async function downloadCertificatePdf(intern: InternProfile): Promise<void> {
  const blob = await generateCertificatePdfBlob(intern);
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `Certificate_${intern.name.replace(/\s+/g, '_')}_Innovara_Dynamics.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

/**
 * Triggers direct download of the official LOR PDF
 */
export async function downloadLorPdf(intern: InternProfile): Promise<void> {
  const blob = await generateLorPdfBlob(intern);
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `LOR_${intern.name.replace(/\s+/g, '_')}_Innovara_Dynamics.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

/**
 * Triggers direct download of the official Logbook PDF
 */
export async function downloadLogbookPdf(intern: InternProfile, customEntries?: any[]): Promise<void> {
  const blob = await generateLogbookPdfBlob(intern, customEntries);
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `Logbook_${intern.name.replace(/\s+/g, '_')}_Innovara_Dynamics.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}
