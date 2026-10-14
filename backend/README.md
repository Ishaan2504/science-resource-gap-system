# Science Resource Gap API (Science on Wheels)

Backend API for the Science Resource Gap Assessment, Prioritization, Requirement Generation, and NGO Intervention Tracking System.

## Requirements

- Node.js 20+
- PostgreSQL 14+ (or a Supabase project database)
- Optional: Redis (for background BullMQ workers; the API operates gracefully without Redis if omitted)

## Quick Start with Supabase & Google Gemini

### 1. Environment Configuration

Copy `.env.example` to `.env` in the `backend/` directory:

```powershell
Copy-Item .env.example .env
```

Open `backend/.env` and configure:

1. **`DATABASE_URL`**: Your Supabase PostgreSQL connection string (found in Supabase Dashboard -> Project Settings -> Database -> Connection string).
   - *Recommended*: Transaction pooler (port 6543) or Session pooler / Direct (port 5432).
   - Format: `postgres://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
2. **`JWT_ACCESS_SECRET`** and **`JWT_REFRESH_SECRET`**: Strong, unique random strings.
3. **`GEMINI_API_KEY`**: Your Google Gemini API key from [Google AI Studio](https://aistudio.google.com/).
4. **`GEMINI_MODEL`**: Defaults to `gemini-1.5-flash`.
5. **`CORS_ALLOWED_ORIGINS`**: `http://localhost:5173,https://localhost` (add production domains as needed).

### 2. Database Initialization (Migrations & RLS)

You can initialize the database using either of the following methods:

- **Option A (Automated CLI Migration)**:
  ```powershell
  npm run migrate
  ```
  Applies all migration files in `backend/migrations/` sequentially, including core tables, master categories, user feedback, and Supabase Row Level Security (RLS) policies.

- **Option B (Supabase SQL Editor)**:
  Copy the contents of `backend/supabase_setup.sql` and execute them directly in the Supabase SQL Editor.

### 3. Seeding Test Accounts & Master Data

Populate master categories, science laboratory equipment, and test accounts for each role:

```powershell
npm run seed:demo
```

This creates the following verified test accounts:

| Role | Email / Identifier | Password | Description |
|---|---|---|---|
| **Administrator** | `admin@scienceonwheels.in` | `Password123` | Full access, school & NGO verification, reports |
| **School Official** | `school@scienceonwheels.in` (or UDISE `29230101201`) | `Password123` | GHSS Kolar: assessments, gaps, requirements |
| **NGO / CSR** | `ngo@scienceonwheels.in` | `Password123` | Science For All Foundation: accept interventions, delivery updates |
| **Field Coordinator**| `fc@scienceonwheels.in` | `Password123` | District coordinator assigned to GHSS Kolar |

### 4. Running the API

```powershell
# Development mode (with live reload)
npm run dev

# Production build & start
npm run build
npm start
```

API is hosted at `http://localhost:3000/api/v1`.

### 5. Running Tests

```powershell
npm test
```
Runs the role-based authorization and security regression test suite.
