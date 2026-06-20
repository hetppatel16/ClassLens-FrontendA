# ClassLens Frontend

Admin dashboard for the ClassLens attendance system. This Next.js app lets admins manage teachers, students, subjects, enrollments, and run a staging sync that updates live attendance data.

## Features
- Admin authentication and dashboard navigation
- CRUD for teachers, students, subjects, enrollments, and subject-to-department mapping
- Bulk upload (CSV/Excel) with templates and row-level error display
- One-click staging sync to push `DatabaseAdminApp_*` data into `Home_*`

## Tech Stack
- Next.js (App Router)
- React 18
- Tailwind CSS

## Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

## Setup
1. Install dependencies:
	 ```bash
	 pnpm install
	 ```

2. Create `.env.local`:
	 ```bash
	 NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
	 ```

3. Start the dev server:
	 ```bash
	 pnpm dev
	 ```

## Bulk Upload Format
The bulk upload dialog accepts CSV or Excel. Excel files are converted to CSV in the browser before upload.

Use the in-app template downloads to get the latest required columns for each upload type.

## Sync Flow
The Sync button on the Overview page calls:
```
POST /api/admin/sync/staging/
```
This endpoint should process the latest staging data and update the live attendance data.

## Notes
- Use `127.0.0.1` instead of `localhost` on Windows to avoid IPv6 resolution issues.
- If your backend serves Excel templates, the download links are expected under:
	`/api/admin/{entity}/download_template/`

## Scripts
- `pnpm dev` - Run dev server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Lint