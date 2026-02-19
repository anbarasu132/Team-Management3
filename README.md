# Team Management Web Application

Full-stack Team Management system with role-based access control.

## Tech Stack
- Frontend: React (Vite) + Tailwind CSS
- Backend: Node.js + Express
- Database: MySQL
- Auth: JWT
- Password Hashing: bcrypt

## Project Structure

```text
backend/
  src/
    config/
    controllers/
    middleware/
    routes/
    utils/
    app.js
    server.js
  sql/schema.sql
  .env.example
  package.json

frontend/
  src/
    api/
    components/
    context/
    layouts/
    pages/
      public/
      dashboards/
    App.jsx
    main.jsx
  .env.example
  package.json
```

## Backend Setup
1. Open MySQL and run `backend/sql/schema.sql`.
2. Copy `backend/.env.example` to `backend/.env` and update values.
3. Start backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

Backend base URL: `http://localhost:5000/api`

## Frontend Setup
1. Copy `frontend/.env.example` to `frontend/.env`.
2. Start frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Frontend URL: `http://localhost:5173`

## Roles and Access
- Admin: Manage news, vacancies, users, teams.
- Leader: Create/manage team, assign co-leader, add/remove participants (max 8), create/assign projects, monitor logs/status.
- Co-Leader: View team details/projects and progress.
- Participant: View assigned projects and update status.

## Auth Notes
- Registration allows `leader` and `participant` only.
- Admin account is inserted by SQL seed.
- Token is stored in `localStorage`.
- Private routes are protected by JWT + role checks.

## Default Admin
- Email: `admin@example.com`
- Password: `Admin@123`
