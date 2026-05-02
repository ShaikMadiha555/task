# Team Tasks — full-stack project & task manager

Web app with **signup/login**, **projects & teams**, **tasks** (assign, status, due dates), **dashboard** (counts, overdue, recent activity), and **per-project roles** (`ADMIN` / `MEMBER`) enforced by the API.

## Stack

- **Backend:** Node.js, Express, Prisma, **MySQL** (e.g. XAMPP), JWT, Zod validation  
- **Frontend:** React (Vite), TypeScript, React Router  
- **API:** REST under `/api/*`

## Local setup (XAMPP + MySQL)

### 1. Start MySQL in XAMPP

Open **XAMPP Control Panel** and start **MySQL** (port **3306** is the default).

### 2. Create the database

Open **phpMyAdmin** (usually [http://localhost/phpmyadmin](http://localhost/phpmyadmin)):

- Click **New** (or “Databases”), name the database **`taskapp`**, choose **utf8mb4_unicode_ci**, and create it.

If your MySQL **root** user has a **password**, you will set that in `DATABASE_URL` in the next step (see `backend/.env.example`).

### 3. Backend

```bash
cd backend
copy .env.example .env
```

Edit `backend/.env` and set **`DATABASE_URL`** to match your MySQL user, password, host, port, and database name. The XAMPP default (root, no password) is already in `.env.example`:

`mysql://root:@localhost:3306/taskapp`

Then:

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

API runs at **http://localhost:4000** (`GET /health`).

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI runs at **http://localhost:5173**. Vite proxies `/api` to the backend in development.

### Optional: run API + web together

From the repo root (after `npm install` in the root for `concurrently`):

```bash
npm run install:all
npm run dev
```

## Demo accounts (after seed)

| Email               | Password   | Role in demo project      |
|---------------------|------------|---------------------------|
| alice@example.com   | Demo1234!  | Admin (owner)             |
| bob@example.com     | Demo1234!  | Member                    |

## REST API overview

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/register` | Body: `email`, `password`, `name` |
| POST | `/api/auth/login` | Returns JWT |
| GET | `/api/auth/me` | Bearer token |
| GET | `/api/projects` | Projects you belong to |
| POST | `/api/projects` | Create project (you become admin) |
| GET | `/api/projects/:id` | Detail + members |
| PATCH | `/api/projects/:id` | **Admin** — update name/description |
| DELETE | `/api/projects/:id` | **Admin** — delete project |
| GET | `/api/projects/:id/tasks` | List tasks |
| POST | `/api/projects/:id/tasks` | Create task |
| POST | `/api/projects/:id/members` | **Admin** — add member by email |
| PATCH | `/api/projects/:id/members/:userId` | **Admin** — change role |
| DELETE | `/api/projects/:id/members/:userId` | **Admin** — remove member |
| GET | `/api/tasks/:taskId` | Task detail |
| PATCH | `/api/tasks/:taskId` | Admin, creator, or assignee (title/description: **admin only**) |
| DELETE | `/api/tasks/:taskId` | Admin or creator |
| GET | `/api/dashboard` | Cross-project stats for current user |

Send `Authorization: Bearer <token>` for protected routes.

## Deploy on Railway (public URL)

Railway runs **Linux**, so `$PORT` and reference variables below apply there (your **local Windows** workflow stays the same with XAMPP).

### 0. Push your code to GitHub

Create a repo and upload the **`task`** folder (backend + frontend). Railway deploys from GitHub.

### 1. Create a Railway project

1. Sign in at [railway.app](https://railway.app) with GitHub.
2. **New Project** → **Provision MySQL** (or **Empty Project** → **+ New** → **Database** → **MySQL**).
3. Wait until the MySQL service is running. Its default variables include **`MYSQL_URL`**.

### 2. Deploy the API (backend)

1. In the same project: **+ New** → **GitHub Repo** → select your repo.
2. Open the new service → **Settings** → **Root Directory** → set **`backend`** (important).
3. **Variables** tab → add:

   | Name | Value |
   |------|--------|
   | **`DATABASE_URL`** | Click **Reference variable** → choose your **MySQL** service → **`MYSQL_URL`** (Railway inserts something like `${{ MySQL.MYSQL_URL }}`; exact service name may differ — use the UI autocomplete). |
   | **`JWT_SECRET`** | Any long random string (required in production). |
   | **`NODE_ENV`** | `production` |

4. **Settings** → **Build**:

   - **Build command:** `npx prisma migrate deploy && npm run build`
   - **Start command:** `npm start`  
     (`npm start` runs `node dist/index.js`)

5. **Settings** → **Networking** → **Generate Domain** so the API gets a public HTTPS URL like `https://your-api.up.railway.app`.

6. Add **`CORS_ORIGIN`** on the backend service:

   - After the frontend has a domain (step 3), set it to your **frontend URL**, e.g. `https://your-web.up.railway.app`.
   - Until then you can temporarily use your frontend Railway URL once you know it, or redeploy backend after frontend is live.

### 3. Deploy the website (frontend)

1. **+ New** → **GitHub Repo** → same repo again (second service).
2. **Root Directory** → **`frontend`**.
3. **Variables** → add **`VITE_API_URL`** referencing the backend’s public URL:

   - Example pattern (adjust service name via autocomplete):  
     `https://${{ backend.RAILWAY_PUBLIC_DOMAIN }}`  
     Replace **`backend`** with whatever Railway named your **API** service.

4. **Build command:** `npm run build`  
5. **Start command:** `npm start`  
   (Serves the built `dist` folder with `serve`, binding to Railway’s **`PORT`**.)

6. **Networking** → **Generate Domain** for the frontend. Open that URL in a browser.

7. Go back to the **backend** service and set **`CORS_ORIGIN`** to the **frontend** `https://…` URL (comma‑separate if you add more origins), then redeploy the backend if needed.

### 4. First-time database

Migrations run during the **backend build** (`npx prisma migrate deploy` in the build command), so tables are created on Railway’s MySQL automatically.

Optional: run seed once from your machine with a **temporary** `DATABASE_URL` pointing at Railway MySQL (TCP proxy / external URL if you enable it), or add a one-off Railway **Run** command — not required for a fresh deploy.

---

## Going live (other hosts)

Any host that provides **MySQL** (or MariaDB), **Node** for the API, and static or Node hosting for the UI works the same way: set **`DATABASE_URL`**, **`JWT_SECRET`**, **`CORS_ORIGIN`**, and build the frontend with **`VITE_API_URL`** pointing at the public API.

---

RBAC is enforced server-side; the UI hides some controls for members, but always rely on the API for authorization.
