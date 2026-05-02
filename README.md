# ⚡ TaskFlow — Project Management App

A full-stack project management web app with role-based access control (Admin/Member), task tracking, and team collaboration.

---

## 🚀 Live Demo

**Live URL:** `https://your-app.railway.app` *(update after deployment)*

---

## ✨ Features

### Authentication
- Secure signup and login with JWT tokens (7-day expiry)
- Passwords hashed with bcryptjs (10 rounds)
- Protected routes via Bearer token middleware

### Projects
- Create projects (creator becomes Admin automatically)
- View all projects you belong to
- Edit project details (Admin only)
- Delete projects with cascading task/member removal (Admin only)

### Team Management
- Invite members by email (Admin only)
- Role-based access: **Admin** and **Member**
- Promote/demote member roles (Admin only)
- Remove members from projects (Admin only)

### Tasks
- Create tasks with: title, description, assignee, priority, status, due date
- Priority levels: Low / Medium / High / Critical
- Status tracking: Todo → In Progress → In Review → Done
- Inline editing and deletion
- Search and filter by status/priority
- Overdue detection with visual indicators

### Dashboard
- Stats: total projects, my tasks, in-progress, overdue count
- Task status breakdown with progress bars
- Recent tasks feed

---

## 🏗️ Architecture

```
taskflow/
├── backend/
│   ├── server.js          # Express server + static file serving
│   ├── db.js              # JSON file-based database layer
│   ├── middleware.js       # JWT auth middleware
│   └── routes/
│       ├── auth.js        # Signup, Login, /me
│       ├── projects.js    # Project CRUD + member management
│       └── tasks.js       # Task CRUD + dashboard
├── frontend/
│   ├── index.html         # Single-page app (vanilla JS)
│   └── dist/              # Served as static files
├── railway.toml           # Railway deployment config
├── nixpacks.toml          # Build config
└── README.md
```

---

## 🔌 REST API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/projects` | List my projects | Any |
| POST | `/api/projects` | Create project | Any |
| GET | `/api/projects/:id` | Get project details | Member |
| PUT | `/api/projects/:id` | Update project | Admin |
| DELETE | `/api/projects/:id` | Delete project | Admin |
| POST | `/api/projects/:id/members` | Invite member | Admin |
| DELETE | `/api/projects/:id/members/:userId` | Remove member | Admin |
| PATCH | `/api/projects/:id/members/:userId/role` | Change role | Admin |

### Tasks
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/tasks?projectId=` | List project tasks | Member |
| GET | `/api/tasks/my` | My tasks across projects | Any |
| GET | `/api/tasks/dashboard` | Dashboard stats | Any |
| POST | `/api/tasks` | Create task | Member |
| PUT | `/api/tasks/:id` | Update task | Owner/Admin |
| DELETE | `/api/tasks/:id` | Delete task | Creator/Admin |

---

## ⚙️ Running Locally

### Prerequisites
- Node.js 18+
- npm

### Steps

```bash
# Clone repo
git clone https://github.com/yourusername/taskflow.git
cd taskflow

# Install dependencies
cd backend && npm install && cd ..

# Create .env
cp .env.example backend/.env
# Edit JWT_SECRET in backend/.env

# Start server
node backend/server.js
```

Open http://localhost:3001

---

## 🚂 Deploy to Railway

### Option 1: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project and deploy
railway init
railway up

# Set environment variables
railway variables set JWT_SECRET=your-secret-key-here
railway variables set NODE_ENV=production
```

### Option 2: GitHub Integration

1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. New Project → Deploy from GitHub
4. Select repo
5. Set environment variables:
   - `JWT_SECRET` = `<random 32+ char string>`
   - `NODE_ENV` = `production`
6. Deploy!

Railway auto-detects Node.js and uses `nixpacks.toml` for build config.

---

## 🔐 Role-Based Access Control

| Action | Admin | Member |
|--------|-------|--------|
| View project | ✅ | ✅ |
| Create tasks | ✅ | ✅ |
| Edit own tasks | ✅ | ✅ |
| Edit any task | ✅ | ❌ |
| Delete any task | ✅ | ❌ |
| Delete own task | ✅ | ✅ |
| Invite members | ✅ | ❌ |
| Remove members | ✅ | ❌ |
| Change roles | ✅ | ❌ |
| Edit project | ✅ | ❌ |
| Delete project | ✅ | ❌ |

---

## 🗄️ Data Storage

Uses JSON file-based storage (`backend/data.json`) — zero external dependencies required. Suitable for demos and small teams.

For production at scale, replace `db.js` with PostgreSQL (via `pg` or `prisma`):

```js
// Swap db.js for prisma:
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
```

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| Auth | JWT + bcryptjs |
| Database | JSON file (no external DB required) |
| Frontend | Vanilla JS + Custom CSS |
| Fonts | Syne + DM Sans (Google Fonts) |
| Deployment | Railway + Nixpacks |

---

## 🎬 Demo Video

[Watch 2-min demo](https://your-demo-link.com) *(add after recording)*

---

## 📝 License

MIT
