# TaskFlow — Team Task Management App

A full-stack collaborative task management web application built with **Node.js**, **Express**, **SQLite**, and **React**.

## ✨ Features

- **JWT Authentication** — Secure signup & login with token-based auth (7-day expiry)
- **Role-Based Access Control** — Admin and Member roles with enforced permissions
- **Project Management** — Create projects; admins can add/remove members
- **Kanban Board** — Drag-free visual board with To Do / In Progress / Done columns
- **Task Management** — Full CRUD with title, description, due date, priority, assignee
- **Dashboard** — Donut charts for status/priority breakdown, tasks-per-user bar chart, project progress, recent tasks, overdue count
- **Responsive UI** — Dark-themed, polished interface

## 🔐 Role Permissions

| Feature | Admin | Member |
|---|---|---|
| Create tasks | ✅ | ❌ |
| Assign tasks | ✅ | ❌ |
| Update task status | ✅ | ✅ (own tasks) |
| Delete tasks | ✅ | ❌ |
| Add/remove members | ✅ | ❌ |
| Delete project | ✅ | ❌ |
| View project & tasks | ✅ | ✅ |

## 🗄️ Database Schema

```
users           — id, name, email, password, created_at
projects        — id, name, description, created_by, created_at
project_members — id, project_id, user_id, role, joined_at
tasks           — id, project_id, title, description, due_date, priority, status, assigned_to, created_by, created_at, updated_at
```

## 🚀 Local Development

### Prerequisites
- Node.js v18+
- npm

### Backend Setup

```bash
# Clone the repo
git clone https://github.com/IR980/team-task-manager.git
cd team-task-manager

# Install backend deps
npm install

# Copy and configure environment
cp .env
# Edit .env — set JWT_SECRET to a random string

# Start backend (dev mode)
npm run dev   # uses nodemon; runs on http://localhost:5000
```

### Frontend Setup

```bash
# In a new terminal
cd client
npm install
npm run dev   # runs on http://localhost:5173 (proxies /api to :5000)
```

Open `http://localhost:5173` in your browser.

## 🌐 Production Build (Local)

```bash
# From project root — builds React into client/dist
npm run build

# Start production server (serves API + static files)
NODE_ENV=production npm start
# Visit http://localhost:5000
```

## ☁️ Deploy to Railway

### One-click deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)

### Manual deploy steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/team-task-manager.git
   git push -u origin main
   ```

2. **Create Railway project**
   - Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
   - Select your repository

3. **Set Environment Variables** in Railway dashboard:
   ```
   NODE_ENV=production
   JWT_SECRET=your_random_32_char_secret_here
   PORT=5000
   ```
   > Railway auto-sets `PORT`, but setting it explicitly is fine.

4. **Deploy** — Railway runs `npm install && npm run build` then `npm start` automatically (via `railway.toml`).

5. **Access** — Railway provides a public URL like `https://your-app.up.railway.app`

### Notes for Railway
- SQLite DB is stored in the container filesystem. For persistence across deploys, consider using Railway's **Volume** feature or migrating to PostgreSQL.
- The `railway.toml` configures build and start commands automatically.

## 📡 API Reference

### Auth
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | `{name, email, password}` | Register new user |
| POST | `/api/auth/login` | `{email, password}` | Login, returns JWT |
| GET | `/api/auth/me` | — | Get current user |

### Projects
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/projects` | ✅ | List user's projects |
| POST | `/api/projects` | ✅ | Create project |
| GET | `/api/projects/:id` | ✅ | Get project + members |
| PUT | `/api/projects/:id` | Admin | Update project |
| DELETE | `/api/projects/:id` | Admin | Delete project |

### Members
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/projects/:id/members` | ✅ | List members |
| POST | `/api/projects/:id/members` | Admin | Add member by email |
| DELETE | `/api/projects/:id/members/:userId` | Admin | Remove member |

### Tasks
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/projects/:id/tasks` | ✅ | List project tasks |
| POST | `/api/projects/:id/tasks` | Admin | Create task |
| PUT | `/api/tasks/:id` | Admin/Assigned | Update task |
| DELETE | `/api/tasks/:id` | Admin | Delete task |

### Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard` | ✅ | Aggregated stats |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Vite |
| Backend | Node.js, Express 4 |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Deployment | Railway |

## 📁 Project Structure

```
team-task-manager/
├── server.js              # Express server entry point
├── db.js                  # SQLite schema & initialization
├── middleware/
│   └── auth.js            # JWT verification middleware
├── routes/
│   ├── auth.js            # Signup / Login / Me
│   ├── projects.js        # Project CRUD + members
│   ├── tasks.js           # Task CRUD
│   └── dashboard.js       # Aggregated stats
├── client/
│   ├── src/
│   │   ├── App.jsx        # Router & layout
│   │   ├── api.js         # Fetch wrapper
│   │   ├── index.css      # Global styles & design tokens
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── components/
│   │   │   └── Sidebar.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Signup.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Projects.jsx
│   │       └── ProjectDetail.jsx
│   └── package.json
├── railway.toml
├── .env.example
└── README.md
```

## 🎥 Demo Video Outline (2–5 min)

1. Show the signup/login flow
2. Create a project → becomes Admin
3. Add a team member by email
4. Create tasks with different priorities and assign them
5. Switch to Member account — show restricted UI
6. Member updates task status on their assigned task
7. Return to Admin → show Dashboard stats, overdue tasks, tasks-per-user chart
8. Show the Kanban board and List view

---

Built with ❤️ —> By - Irshad
