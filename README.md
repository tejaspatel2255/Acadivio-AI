# 🎓 Acadivio AI — Intelligent Academic ERP & Adaptive Learning Platform

Acadivio AI is an advanced, full-stack Academic ERP & Adaptive Learning Platform designed for modern educational institutions, faculty, and students. The platform integrates role-based administrative workflows (Student, Teacher, Admin), internal marks tracking, target SGPA/academic goal planning, adaptive smart practice powered by Google Gemini AI, interactive lessons, quizzes, achievements, and real-time analytical dashboards.

---

## 🚀 Key Features

### 🧑‍🎓 For Students
* **Academic Dashboard & Stats:** Track overall progress, completed lessons, quiz scores, and academic achievements.
* **Exam Planner & SGPA Target Calculator:** Input internal assessment marks, set target SGPA goals, and compute required end-semester exam scores automatically.
* **AI Academic Assistant:** Get hints, concept breakdowns, and study advice powered by Google Gemini AI without revealing quiz answers.
* **Smart Practice (Adaptive Learning):** Generate AI-powered practice quizzes tailored dynamically to personal performance and weak topics.
* **Academic Challenges & Badges:** Participate in academic projects, earn XP points, level up, and view live platform leaderboards.

### 👩‍🏫 For Teachers
* **Classroom & Roster Management:** Create classes, enroll students, and manage academic rosters.
* **Internal Assessment Management:** Enter and update internal assessment marks (Tests, Assignments, Lab marks) for enrolled students.
* **Content Creation:** Build interactive lessons, custom quizzes (multiple choice, true/false, short answer), and academic challenges.
* **AI Quiz Generation:** Automatically generate structured quizzes from topics or lesson content using Google Gemini AI.
* **Submission Grading & Retakes:** Review student challenge submissions and approve or manage retake requests.

### 🛡️ For Admins
* **Institutional Governance:** Manage registered users, assign subject permissions to teachers, process teacher sign-up approvals, and handle student profile modification requests.
* **Multi-Institution Analytics:** Monitor user growth, active institutions, and platform-wide performance metrics.
* **Leaderboard Moderation:** View global top-tier academic rankings and manage user statistics.

---

## 📂 Project Structure

```
Acadivio-AI/
├── frontend/             # Next.js App Router Frontend Application
│   ├── app/              # App Router Pages, Layouts, and Dashboard Subroutes
│   ├── components/       # UI Components (AiTutor, LiveLeaderboard, Navbar, etc.)
│   ├── contexts/         # Authentication & Global React Contexts
│   ├── lib/              # API Client, Socket.IO Instance, Types & Utilities
│   └── public/           # Static Brand Assets & Logos
├── backend/              # Node.js + Express REST API & Socket.IO Server
│   ├── config/           # Single-Instance MongoDB Database Connection
│   ├── controllers/      # Express Route Controllers (AI Controller, etc.)
│   ├── middleware/       # Auth (JWT), RBAC Roles, and Subject Access Controls
│   ├── models/           # 23 Mongoose Database Schemas
│   ├── routes/           # REST API Routes (/api/auth, /api/exam-planner, etc.)
│   ├── scripts/          # Maintenance Scripts
│   ├── tests/            # Test and Diagnostic Utilities
│   └── utils/            # Gemini AI Service Wrapper & Network Utilities
```

---

## 🛠️ Technology Stack

* **Frontend:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Framer Motion, Lucide Icons, Recharts, Socket.IO Client.
* **Backend:** Node.js, Express.js, MongoDB (Mongoose 9), WebSockets (Socket.IO), Nodemailer, JSON Web Tokens (JWT).
* **AI Integration:** Google Gemini API (`@google/generative-ai` v0.24) with multi-model fallback support (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`).

---

## ⚙️ Environment Setup

### 1. Backend Environment (`backend/.env`)
```ini
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/acadivio?appName=Cluster0
PORT=3001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_secure_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
GEMINI_API_KEY=your_google_gemini_api_key
```

### 2. Frontend Environment (`frontend/.env.local`)
```ini
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🏃 Running Locally

### Step 1: Start Backend Server
```bash
cd backend
npm install
npm start
```
*Backend API starts on port 3001 with single-instance MongoDB connection pool and WebSockets.*

### Step 2: Start Frontend Application
```bash
cd frontend
npm install
npm run dev
```
*Access frontend UI at [http://localhost:3000](http://localhost:3000).*
