# FormFlow — Project Summary

## What it is

FormFlow is a full-stack form builder platform. Users sign up, build custom
forms with a visual builder, share them publicly (or restrict them to
approved "private users"), and collect and analyze the responses. It also
supports turning an uploaded spreadsheet directly into a form with
pre-populated response data, and an admin dashboard for managing all users
and forms across the platform.

## Who uses it

- **Form creators** — sign up, build forms, share links, review responses,
  export results.
- **Private users** — invited by a form owner to fill in or view responses
  for specific forms only, without full account access.
- **Admins** — manage all users, monitor platform-wide activity, and adjust
  account limits/status from a separate admin dashboard.

## Core features

- **Drag-and-drop form builder** — text fields, tables/grids, lookups,
  formulas, and date/time calculations between fields.
- **Multiple output formats** — confirmation pages can render as tables or
  paragraphs, with results exportable to Excel, Word, and PDF, plus
  WhatsApp-formatted sharing text. Formatting (colors, fonts, multiple
  output sections) carries through to every export format consistently.
- **Excel/spreadsheet upload** — uploading a spreadsheet in Database
  Management creates a real form (fields inferred from the column headers)
  and imports every row as a response, so uploaded data is immediately
  usable like any other form's responses.
- **Responses dashboard & analytics** — view, edit, and delete individual
  responses; per-form stats; charts via Recharts.
- **Private user access** — form owners can grant restricted accounts
  access to fill out or view responses for specific forms only.
- **Admin dashboard** — user management, account suspension, per-user form
  limits, and live usage metrics.
- **Live dashboard metrics** — "Total Forms" and "Total Responses" are
  computed from the forms/responses actually loaded for the signed-in user,
  so the numbers stay accurate without needing to log out and back in.

## How it's built

**Frontend**
- React + TypeScript, built with Vite
- Wouter for routing, React Query for server state, React Context for auth
  and form state
- Tailwind CSS with shadcn/ui (Radix UI primitives)

**Backend**
- Node.js + Express, TypeScript (ESM), tsx for dev / esbuild for production
- REST API under `/api/*`
- Custom email/password auth with bcrypt, session-based login

**Data storage**
- MongoDB is the active database in this environment (`MONGODB_URI`)
- A Postgres/Drizzle ORM implementation also exists behind the same storage
  interface, so the app can run on either backend without changing route
  code

**Document generation**
- Excel via `xlsx`, Word via `docx`, PDF via `jsPDF`

## Recent work in this project

- Restored the "upload creates a form" flow: uploading a spreadsheet now
  registers a form with fields matching the spreadsheet's headers and saves
  each row as a response, matching how this feature originally worked
  before it was unintentionally dropped in an earlier rewrite.
- Fixed the dashboard's "Total Forms" and "Total Responses" counters, which
  were reading a cached number that only refreshed at login; they now
  reflect the current, live count at all times.

## Open follow-up

- **Deleting an uploaded database**: since uploads now create a form
  (rather than a standalone database record), there's currently no delete
  button for them on the Database Management page. This is tracked as a
  pending follow-up task.
