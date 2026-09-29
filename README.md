# 🎓 Acadivio AI

### Intelligent Academic ERP & Adaptive Learning Platform

---

## 📋 Project Overview

**Acadivio AI** is a full-stack Academic Enterprise Resource Planning (ERP) and Adaptive Learning Platform designed for modern universities and colleges. It unifies institutional administration, faculty management, student academic tracking, AI-powered tutoring, and adaptive practice into a single, role-driven platform.

The platform serves three distinct user roles — **Student**, **Teacher**, and **Admin** — each with purpose-built dashboards, strict data isolation, and role-enforced API access.

---

## ❗ Problem Statement

Traditional academic management systems are fragmented: marks are tracked in spreadsheets, lesson content is distributed via messaging apps, and students receive no personalized feedback on their performance. Faculty have no structured tools for quiz creation or performance analytics. Administrators lack unified oversight of institutional operations.

Acadivio AI solves this by:
- Centralizing academic data under one authenticated, role-governed platform
- Replacing passive content delivery with AI-adaptive practice generation
- Giving every stakeholder (student, teacher, admin) real-time, data-driven insights
- Enforcing institutional data isolation so student A can never see student B's records

---

## 🎯 Objectives

1. Provide students with a personalized academic dashboard showing marks, progress, goals, and exam readiness
2. Enable teachers to manage classes, enter marks, create content, and review student performance
3. Give administrators centralized control over users, institutions, classes, and teacher authorizations
4. Integrate Google Gemini AI for adaptive quiz generation and conversational academic tutoring
5. Enforce strict role-based access control (RBAC) at the API level — not just in the UI
6. Deliver a professional, consistent, accessible interface across desktop, tablet, and mobile

---

## ✨ Major Features

### 🧑‍🎓 Student Features
| Feature | Description |
|---------|-------------|
| **Academic Dashboard** | Live stats: active semester, overall GPA, lesson completion, quiz scores, XP level |
| **Semester Selector** | Switch semesters; all data (marks, subjects, goals, analytics) updates accordingly |
| **Exam Planner** | Enter internal assessment marks per subject; compute required end-semester score for target SGPA |
| **Marks Overview** | Subject-wise breakdown of internal assessment scores by exam type |
| **Smart Practice** | AI-generated adaptive MCQ quizzes tailored to weak subjects and historical performance |
| **AI Tutor** | Conversational academic assistant powered by Gemini — provides hints without revealing answers |
| **Lessons** | Browse and complete lessons published by teachers for enrolled classes |
| **Quizzes** | Attempt teacher-created quizzes; receive scored results and explanations |
| **Challenges** | Participate in academic projects and coding challenges; submit work for review |
| **Achievements & Badges** | Earn XP for activities; unlock milestone badges; level up progressively |
| **Leaderboard** | View global platform rankings by XP score |
| **Analytics** | Personal performance charts: quiz history, marks distribution, learning streaks |
| **Notifications** | Real-time in-app notifications for quiz results, marks updates, and announcements |
| **Profile** | Update personal info, class/semester selection, and account preferences |

### 👩‍🏫 Teacher Features
| Feature | Description |
|---------|-------------|
| **Class Dashboard** | Overview of assigned classes and enrolled students |
| **Internal Marks Entry** | Enter and update assessment marks with server-side bounds validation |
| **Lesson Management** | Create, edit, and publish lessons for assigned subjects |
| **Quiz Builder** | Manually create quizzes or AI-generate them from a topic/description |
| **Challenge Management** | Post academic challenges; review and grade student submissions |
| **Performance Analytics** | View student completion rates, quiz scores, and marks distributions |
| **Retake Requests** | Review and approve student requests to retake quizzes |
| **Profile** | Manage personal profile and view assigned subjects |

### 🛡️ Admin Features
| Feature | Description |
|---------|-------------|
| **User Management** | View all students and teachers; manage accounts and statuses |
| **Teacher Approvals** | Approve or reject teacher sign-up requests |
| **Subject Assignments** | Assign teachers to specific subjects and classes |
| **Institution Management** | Create and manage institutions; link users to institutions |
| **Class & Semester Control** | Define class numbers and active semesters |
| **Content Moderation** | View all lessons, quizzes, and challenges across the platform |
| **Global Analytics** | Platform-wide stats: total users, institutions, active content, quiz attempts |
| **Leaderboard Oversight** | View and monitor global XP rankings |
| **Notification Broadcasting** | Send platform-wide announcements to users |

### 🤖 AI Features
| Feature | Description |
|---------|-------------|
| **Adaptive Smart Practice** | Gemini generates 20 unique MCQs per session; difficulty scales automatically (Beginner/Intermediate/Expert) based on a composite score from quiz history (60%) and internal marks (40%) |
| **AI Tutor Chat** | Context-aware academic guidance; graceful fallback to structured 5-point advice if Gemini is unavailable |
| **AI Quiz Generation** | Teachers can generate full quizzes from a topic with one click |
| **Essay/Short Answer Grading** | AI-assisted grading for open-ended challenge submissions |

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **Styling** | Tailwind CSS 4, Framer Motion |
| **UI Components** | Lucide React icons, Recharts (charts) |
| **Real-time** | Socket.IO Client |
| **HTTP Client** | Axios |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas (Mongoose 9 ODM) |
| **WebSockets** | Socket.IO |
| **Authentication** | JSON Web Tokens (JWT) + bcryptjs |
| **AI** | Google Gemini API (`@google/generative-ai` v0.24) |
| **Email** | Nodemailer |
| **Input Validation** | express-validator |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                     │
│           Next.js 16 (App Router + SSR)              │
│   Student │ Teacher │ Admin Dashboards (TypeScript)   │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP REST + Socket.IO
                        ▼
┌─────────────────────────────────────────────────────┐
│               EXPRESS.JS REST API (Port 3001)         │
│                                                      │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │  Auth    │  │  RBAC     │  │  Subject Access  │  │
│  │  JWT     │  │  Middleware│  │  Middleware      │  │
│  └──────────┘  └───────────┘  └──────────────────┘  │
│                                                      │
│  Routes: /api/auth  /api/exam-planner  /api/quizzes  │
│          /api/lessons  /api/challenges  /api/badges   │
│          /api/teacher  /api/admin  /api/ai  ...       │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │            Google Gemini API                  │   │
│  │  gemini-2.0-flash → gemini-2.5-flash →       │   │
│  │  gemini-flash-latest → gemini-pro-latest      │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────┘
                           │ Mongoose ODM
                           ▼
┌─────────────────────────────────────────────────────┐
│              MONGODB ATLAS (Cloud)                    │
│   23 Collections: Users, Quizzes, Lessons,           │
│   InternalAssessments, ExamGoals, QuizAttempts,      │
│   Challenges, Badges, Notifications, ...             │
└─────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Architecture

The database is **MongoDB Atlas** with **Mongoose 9** as the ODM. The database name is `ecolearn` (Atlas cluster — do not rename).

### Core Collections (23 Models)

| Collection | Purpose |
|-----------|---------|
| `users` | All users (student/teacher/admin) with role, institution, class, semester |
| `quizzes` | Teacher-created and AI-generated quizzes |
| `quizattempts` | Student quiz submission records and scores |
| `lessons` | Lesson content published by teachers |
| `studentprogresses` | Lesson completion records per student |
| `internalassessments` | Internal marks per student, subject, exam type, semester |
| `examgoals` | Student target SGPA goals and required score calculations |
| `challenges` | Academic project/coding challenges |
| `challengesubmissions` | Student challenge submissions and grades |
| `badges` | Achievement badge definitions |
| `userbadges` | Badges earned per student |
| `notifications` | In-app notifications per user |
| `requests` | Teacher sign-up approvals and student modification requests |
| `studentperformances` | Aggregated performance metrics |

### Performance Indexes

All high-traffic models include compound indexes for common query patterns:
- `internalassessments`: `{student_id, semester}`, `{teacher_id, subject_name}`, compound 5-field
- `quizattempts`: `{quiz_id, student_id}`, `{student_id, status}`
- `studentprogresses`: unique `{student_id, lesson_id}`
- `notifications`: `{user_id, is_read}`, `{user_id, created_at: -1}`

---

## 🔐 Authentication

- **Method:** JWT (JSON Web Tokens) via `Authorization: Bearer <token>` header
- **Hashing:** bcryptjs (salt rounds: 10) for all passwords
- **Token lifetime:** Configurable; default 7 days
- **Middleware chain:** `authMiddleware` → `roleMiddleware` → `subjectAccessMiddleware` (where needed)
- **Fail-fast validation:** Server refuses to start if `JWT_SECRET` is missing or under 32 characters
- **Token storage:** Client-side `localStorage` — tokens are never sent to third parties

### Role Hierarchy

```
admin   → full platform access
teacher → assigned classes + subjects only (enforced server-side)
student → own academic data only (ownership checked per endpoint)
```

---

## 🔌 API Overview

All endpoints are prefixed with `/api`.

| Prefix | Description | Auth Required |
|--------|-------------|--------------|
| `/api/auth` | Register, login, logout, forgot password | No (login/register) |
| `/api/exam-planner` | Internal marks CRUD, SGPA goals | Student/Teacher |
| `/api/quizzes` | Quiz CRUD, smart practice, AI generation | Student/Teacher |
| `/api/lessons` | Lesson CRUD, progress tracking | Student/Teacher |
| `/api/challenges` | Challenge CRUD, submissions | Student/Teacher |
| `/api/badges` | Badge definitions, award, user badges | All roles |
| `/api/notifications` | Read/mark notifications | Student/Teacher |
| `/api/teacher` | Teacher-specific analytics and roster | Teacher |
| `/api/admin` | Full admin panel operations | Admin only |
| `/api/ai` | AI tutor chat, essay grading | Student |

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```ini
# Server
PORT=3001

# Database (Required)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname?appName=Cluster0

# JWT (Required — minimum 32 characters)
JWT_SECRET=replace_with_a_long_random_secret_at_least_64_chars

# Google Gemini AI (Required for AI features)
GEMINI_API_KEY=your_google_gemini_api_key

# CORS — comma-separated allowed origins
FRONTEND_URL=http://localhost:3000

# Internal API reference
API_URL=http://localhost:3001
```

> **Generate a strong JWT_SECRET:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### Frontend (`frontend/.env.local`)

```ini
NEXT_PUBLIC_API_URL=http://localhost:3001
```

See `backend/.env.example` for a full template with documentation.

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+
- npm 9+
- MongoDB Atlas account (or local MongoDB 6+)
- Google Gemini API key (https://aistudio.google.com/)

### 1. Clone the repository
```bash
git clone https://github.com/tejaspatel2255/Acadivio-AI.git
cd Acadivio-AI
```

### 2. Backend setup
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI, JWT_SECRET, and GEMINI_API_KEY
npm install
npm start
```
Backend API starts on port **3001**.

### 3. Frontend setup
```bash
cd frontend
# Create frontend/.env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev
```
Frontend starts on port **3000** — visit [http://localhost:3000](http://localhost:3000).

---

## 🧪 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` (backend) | Start backend with nodemon (auto-reload) |
| `npm start` (backend) | Start backend in production mode |
| `npm run dev` (frontend) | Start Next.js dev server with HMR |
| `npm run build` (frontend) | Build frontend for production |
| `npm start` (frontend) | Serve production frontend build |
| `npm run lint` (frontend) | Run ESLint on frontend code |

---

## 📦 Production Build

### Backend
The backend is a standard Node.js/Express server. Deploy to any Node.js-capable host (Railway, Render, AWS, etc.):
```bash
cd backend
npm install --production
node server.js
```

### Frontend
The Next.js frontend supports both static export and server-side rendering:
```bash
cd frontend
npm install
npm run build
npm start
```
Or deploy to **Vercel** with zero configuration — connect your GitHub repo and set `NEXT_PUBLIC_API_URL` in the Vercel environment variables dashboard.

---

## 📁 Project Structure

```
Acadivio-AI/
├── backend/                        # Node.js + Express REST API
│   ├── config/
│   │   └── db.js                   # Cached Mongoose connection
│   ├── controllers/
│   │   └── aiController.js         # Gemini AI tutor + essay grading
│   ├── middleware/
│   │   └── auth.js                 # JWT auth, RBAC roles, subject access
│   ├── models/                     # 23 Mongoose schemas with indexes
│   ├── routes/                     # REST API route handlers
│   │   ├── auth.js                 # Authentication
│   │   ├── examPlanner.js          # Marks + SGPA goal engine
│   │   ├── quizzes.js              # Quiz CRUD + Smart Practice AI engine
│   │   ├── lessons.js              # Lesson management
│   │   ├── challenges.js           # Academic challenges
│   │   ├── badges.js               # Achievement system
│   │   ├── notifications.js        # In-app notifications
│   │   ├── teacher.js              # Teacher analytics
│   │   └── admin.js                # Admin operations
│   ├── scripts/                    # Maintenance and seeding scripts
│   ├── tests/                      # Diagnostic utilities
│   ├── utils/
│   │   ├── ai.js                   # Gemini AI wrapper (multi-model fallback)
│   │   └── portDetector.js         # Dynamic port resolution
│   ├── .env.example                # Environment template
│   ├── server.js                   # Application entry point
│   └── package.json
│
├── frontend/                       # Next.js 16 App Router Application
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── student/            # All student pages
│   │   │   ├── teacher/            # All teacher pages
│   │   │   └── admin/              # All admin pages
│   │   ├── login/                  # Authentication pages
│   │   └── register/
│   ├── components/                 # Shared UI components
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Button.tsx
│   │   └── AiTutor.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx         # JWT-based auth state
│   ├── lib/
│   │   ├── api.ts                  # Axios instance + interceptors
│   │   └── socket.ts               # Socket.IO client instance
│   └── public/                     # Static assets and logos
│
├── scripts/                        # Root-level utility scripts
├── tests/                          # Root-level test utilities
├── Photos/                         # Application screenshots
└── README.md
```

---

## 🔒 Security Notes

| Area | Implementation |
|------|---------------|
| **Password hashing** | bcryptjs with salt rounds = 10 |
| **JWT validation** | Required `Authorization: Bearer` header; verified on every protected route |
| **Fail-fast startup** | Server exits immediately if `MONGODB_URI`, `JWT_SECRET` (min 32 chars), or `GEMINI_API_KEY` are missing |
| **Student data isolation** | `/api/exam-planner/marks/:studentId` verifies the requesting user's ID matches `studentId` |
| **Teacher authorization** | `subjectAccessMiddleware` verifies teacher is assigned to the requested subject before any marks write |
| **Admin isolation** | All `/api/admin/*` routes require `roleMiddleware('admin')` |
| **Input validation** | Marks entry rejects: negative values, values exceeding max, zero max marks |
| **CORS** | Configured per-origin allowlist from `FRONTEND_URL` env variable |
| **Gemini key** | API key is server-side only — never exposed in frontend code or API responses |
| **Error messages** | Generic error messages returned to client; detailed errors logged server-side only |
| **No debug endpoints** | No `/api/debug`, `/api/test`, or development-only routes in production code |

> [!CAUTION]
> Never commit `backend/.env` to version control. The `.gitignore` already excludes `.env` files. Always use `.env.example` as the reference template.

---

## 🔮 Future Scope

| Feature | Description |
|---------|-------------|
| **Parent Portal** | Read-only dashboard for parents to monitor student performance |
| **Mobile App** | React Native or Flutter companion app |
| **Video Lessons** | Embedded video content with progress tracking |
| **Timetable Management** | Digital class schedules with calendar integration |
| **Attendance Tracking** | Teacher-marked attendance with student visibility |
| **Plagiarism Detection** | AI-powered originality check for challenge submissions |
| **Multi-language Support** | i18n for regional language interfaces |
| **SMS/Email Notifications** | Push notifications beyond in-app |
| **LMS Integration** | Export/import compatibility with Moodle, Google Classroom |
| **Rate Limiting** | Per-user API rate limiting for production hardening |
| **Offline Mode** | PWA support for low-connectivity environments |

---

## 📄 License

ISC — see `backend/package.json` for license declaration.

---

<div align="center">
  <strong>Acadivio AI</strong> — Built for modern academic institutions.<br/>
  Powered by <strong>Google Gemini AI</strong> · <strong>Next.js</strong> · <strong>MongoDB Atlas</strong>
</div>
