# Intern-Project-submission

**PeopleOS Intern & Code Submission Portal** — A full-stack Next.js application designed for internship management, project code submission, logbook verification, and custom Letter of Recommendation (LOR) visual generation and download.

---

## 🚀 Features

- **Project Submission Console**: Upload zip archives containing project source code with instant extraction and file tree visualization.
- **Monaco Code Visualizer**: Built-in Monaco editor for interactive code review and inspection.
- **Visual LOR Studio**: Dynamic layout editor for administrators to customize company letterheads, position text blocks, and insert dynamic placeholders (`{name}`, `{role}`, `{download_date}`, `{lor_nex_id}`).
- **Multi-Intern LOR Issuance**: Multi-select support for batch issuing official LOR documents to interns.
- **Intern Notice Popup**: Automatic reminder modal notifying interns to submit their project archive for 3–4 working days certificate processing.
- **Logbook Desk**: Weekly activity tracking with supervisor comments and sign-off functionality.
- **Supabase & Postgres Database Integration**: Database persistence for users, submissions, logbooks, and issued LOR records.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS, Vanilla CSS, Lucide Icons
- **Code Inspection**: Monaco Editor (`@monaco-editor/react`)
- **PDF Generation**: Direct Vector `jsPDF` & `html2canvas`
- **Database / Auth**: PostgreSQL (`pg`) & Supabase REST Auth

---

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/YashW25/Intern-Project-submission.git
cd Intern-Project-submission
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 4. Run development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Vercel Deployment

This repository is ready for single-click deployment on [Vercel](https://vercel.com):
1. Import this repository into Vercel.
2. Configure environment variables (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`).
3. Click **Deploy**.
