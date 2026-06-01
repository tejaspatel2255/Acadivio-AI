# 🌱 EcoLearn: Gamified Environmental Education Platform

EcoLearn is a modern, gamified learning platform designed to engage students in environmental science and sustainability. The project features role-based access control (Student, Teacher, Admin), interactive lessons, quizzes, real-world eco-challenges, badge systems, an AI-powered tutor, and comprehensive analytical dashboards.

---

## 🚀 Key Features

### 🧑‍🎓 For Students
*   **Interactive Lessons & Quizzes:** Learn about key environmental topics and test knowledge to earn points.
*   **Eco-Challenges:** Complete real-world activities (e.g., waste reduction, energy saving) and submit evidence for teacher approval.
*   **AI Eco-Tutor:** Get explanations and hints from an AI tutor (powered by Gemini) without leaking quiz answers.
*   **Gamification:** Earn points, level up, unlock achievement badges, and climb the platform-wide leaderboard.
*   **Exam Planner:** Manage schedules, upcoming milestones, and quiz deadlines.

### 👩‍🏫 For Teachers
*   **Classroom Management:** Set up classes, enroll students, and monitor academic progress.
*   **Content Creation:** Create and manage lessons, custom quizzes (multiple choice, true/false, short answer), and environmental challenges.
*   **Submission Grading:** Review and grade student challenge submissions with custom rubrics.
*   **Student Insights:** Track class engagement, average quiz scores, and student participation.

### 🛡️ For Admins
*   **Platform Dashboard:** Analyze user growth, challenge completion rates, and active institutions.
*   **User Management:** Manage registered users, modify roles, approve/reject teacher account requests, and reset stats.
*   **Institution Comparison:** Analyze and compare engagement metrics across different schools, colleges, and NGOs.

---

## 📂 Project Structure

EcoLearn is organized as a monorepo containing a frontend Next.js application and a backend Node.js/Express API.

```
ecolearn/
├── frontend/             # Next.js Frontend Application
│   ├── app/              # Next.js App Router (Pages & Layouts)
│   ├── components/       # Reusable React UI Components
│   ├── contexts/         # Authentication & State Contexts
│   ├── lib/              # API and Socket helper clients
│   └── public/           # Static assets, logos, and icons
├── backend/              # Node.js Express Backend API
│   ├── config/           # Database configurations (MongoDB)
│   ├── controllers/      # Route controllers (AI, Quizzes, Auth, etc.)
│   ├── middleware/       # Express middlewares (Auth, Role check)
│   ├── models/           # Mongoose Database Models
│   ├── routes/           # REST API routes
│   └── utils/            # Helper utilities (Port detection, AI helper)
└── database/             # Relational schema reference
    └── schema.sql        # Database schema references (PostgreSQL/Supabase fallback)
```

---

## 🛠️ Technology Stack

*   **Frontend:** Next.js (App Router), React 19, TypeScript, TailwindCSS v4, Framer Motion (for animations), Lucide React (icons), Recharts (data visualization), Socket.io Client.
*   **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.io, Axios, Nodemailer, JSON Web Tokens (JWT).
*   **AI Integration:** Google Gemini API (via `@google/generative-ai` / model fallbacks like `gemini-2.5-flash` or `gemini-1.5-flash`).

---

## ⚙️ Local Configuration & Environment Setup

Before launching the project, copy the environment templates in both frontend and backend directories and add your credentials.

### 1. Backend Configuration
Navigate to the `backend/` directory, create a `.env` file (copied from `.env.example`), and configure:
```ini
PORT=3001
MONGODB_URI=mongodb://localhost:27017/ecolearn
GEMINI_API_KEY=your_google_gemini_api_key
```

### 2. Frontend Configuration
Navigate to the `frontend/` directory, create a `.env.local` file (copied from `.env.example`), and configure:
```ini
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

*Note: Environment setup helper scripts (`setup-env.ps1`, `create-env.ps1`, and `fix-now.ps1`) are available in the root folder to automate generating `.env.local` templates.*

---

## 🏃 Running the Application Locally

You will need to run the backend API and frontend Next.js application in separate terminals.

### Step 1: Start the Backend API
1. Open a terminal and navigate to the backend:
   ```bash
   cd backend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *The backend will automatically search for an available port starting at `3001` (e.g. `3001` or `3002` if `3001` is busy) and start a Socket.io server.*

### Step 2: Start the Frontend App
1. Open a second terminal and navigate to the frontend:
   ```bash
   cd frontend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 📦 Preparing for Deployment & Git Checklist

To push this project securely to GitHub:

1.  **Do not commit secret keys:** Verify that `.env` or `.env.local` files are NOT tracked by Git. Run:
    ```bash
    git status
    ```
    If any `.env` files appear in the unstaged/staged list, remove them from tracking before committing:
    ```bash
    git rm --cached backend/.env
    git rm --cached frontend/.env.local
    ```
2.  **Verify Git Ignore Rules:** The root `.gitignore` is configured to ignore `node_modules/`, Next.js build directories (`.next/`, `build/`, `dist/`), OS files, log outputs, and all `.env` files automatically at all folder levels.
3.  **Perform Git commit & push:**
    ```bash
    git add .
    git commit -m "Configure README, .gitignore, and .env templates for deployment"
    git push origin main
    ```
