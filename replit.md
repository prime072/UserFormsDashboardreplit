# FormFlow - Form Builder Application

## Overview

FormFlow is a full-stack form builder application that allows users to create, manage, and collect responses from custom forms. The platform supports multiple output formats (Excel, Word, PDF, WhatsApp sharing), private user access controls, and includes an admin dashboard for user management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Query (@tanstack/react-query) for server state, React Context for auth and form state
- **Styling**: Tailwind CSS with shadcn/ui components (New York style)
- **Theme Support**: next-themes for dark/light mode switching
- **UI Components**: Radix UI primitives with custom styling via class-variance-authority

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **Build Tool**: esbuild for production bundling, tsx for development
- **API Design**: RESTful endpoints under `/api/*` prefix

### Data Storage
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Alternative Storage**: MongoDB adapter available (mongo-storage.ts) for flexible deployment
- **Session Storage**: connect-pg-simple for PostgreSQL session storage

### Authentication & Authorization
- **User Auth**: Custom email/password authentication with bcrypt hashing
- **Session Management**: Express sessions stored in database
- **User Types**: 
  - Regular users (form creators)
  - Private users (restricted form access)
  - Admin users (system management)
- **Account Status**: Support for active/suspended user states

### Key Design Patterns
- **Shared Schema**: Database schema defined in `/shared/schema.ts` using Drizzle, shared between client and server
- **Storage Interface**: Abstract storage interface (`IStorage`) allowing swappable database implementations
- **Context Providers**: AuthContext and FormContext for centralized state management
- **Protected Routes**: Client-side route guards for authenticated and admin routes

### Document Generation
- **Excel**: xlsx library for spreadsheet generation
- **Word Documents**: docx library for .docx creation
- **PDF**: jsPDF for PDF generation
- **WhatsApp**: Custom message formatting for share links

## Login & Authentication Status

### Fixed Issues (Session 2)
- **Admin Login**: Now uses fallback credentials (admin/admin123) if VITE_ADMIN_USERNAME/VITE_ADMIN_PASSWORD env vars not set
- **User Authentication**: `/api/auth/login` and `/api/auth/signup` endpoints fully implemented
- **User Lookup**: `getUserByEmail()` searches by both email and username for flexibility
- **Route Registration**: Auth routes now properly registered via `registerAuthRoutes()` in server/index.ts
- **Frontend**: Auth context handles login/signup flow with proper error handling
- **Response Endpoints**: Added `/api/user/responses`, `/api/user/total-responses`, and `/api/forms/:id/stats` endpoints
- **Error Handling**: Improved error messages in form-context.tsx and dashboard.tsx to show status codes and actual error details

### Authentication Flow
- Users sign up with email/password/firstName → endpoint validates → password hashed with bcrypt → user stored in MongoDB
- Login endpoint finds user, verifies password, returns user object → stored in sessionStorage (key: "formflow_user")
- Private users redirect to `/dashboard` after login
- Admin login uses client-side credential check against env vars (or defaults)

### Response Dashboard & Edit Response
- `/api/user/responses` - fetches all responses for user's forms
- `/api/user/total-responses` - fetches count of total responses across all user forms
- `/api/forms/:id/stats` - fetches statistics for a specific form
- `/api/responses/:id` - fetches a single response (GET for viewing, PATCH for updating, DELETE for removing)
- `/api/forms/:id/data` - fetches all response data for a form (used for lookups)
- Edit response feature: appending `?edit={submissionId}` to form URL loads existing response data, changes save via PATCH to `/api/responses/:id`
- All endpoints properly authenticated with x-user-id header where appropriate

### Fixed Issues (Session 3)
- **Edit Response Bug**: Added missing `updateResponse()` and `deleteResponse()` methods to MongoDB storage
- **Response Schema**: Added `updatedAt` field to responseSchema in mongo-storage.ts
- **Response CRUD**: All response endpoints (GET, PATCH, DELETE) now fully functional for all field types

### Private User Response Access
- Private users can view responses for forms they have access to (if owner enables `canPrivateUserViewResponses`)
- `/api/private-user/responses` - fetches all responses for accessible forms (requires x-private-user-id header)
- `/api/private-user/forms/:id/responses` - fetches responses for specific form (requires x-private-user-id header and form permission)
- Private user dashboard at `/private-users` shows all responses for accessible forms
- **How private users access responses**: 
  1. Login at `/private-login` with credentials
  2. Navigate to `/private-users` dashboard (shown in header/menu when logged in as private user)
  3. Under each accessible form, click "View Responses" button → goes to `/private/forms/{formId}/responses`
  4. Alternative: Directly access `/private/forms/{formId}/responses` if they know the form ID
- Form owners can enable/disable private user response viewing on a per-form basis via form settings

## External Dependencies

### Database
- **MongoDB**: Document database (requires MONGODB_URI env var)
- **Connection**: Serverless MongoDB stored in env

### Frontend Libraries
- **Charts**: Recharts for analytics visualizations
- **Animations**: Framer Motion for UI transitions
- **Date Handling**: date-fns for date formatting
- **Form Validation**: Zod with react-hook-form integration

### Development Tools
- **Replit Plugins**: 
  - vite-plugin-runtime-error-modal for error display
  - vite-plugin-cartographer for code mapping
  - vite-plugin-dev-banner for development indicators
- **Custom Plugin**: meta-images plugin for OpenGraph image handling