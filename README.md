# DocVault

A full-stack document management application with version control, team collaboration, and role-based access control.

## Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Convex (real-time database, serverless functions, file storage)
- **Auth:** Clerk (hosted authentication)
- **Storage:** Convex file storage

## Features

- **Document Management:** Upload, organize, rename, and delete documents
- **Version Control:** Full version history for every document with download support
- **Team Collaboration:** Create teams and invite members by email
- **Role-Based Access Control:**
  - **Admin:** Full access — manage members, upload, edit, and delete
  - **Editor:** Upload new versions and edit document metadata
  - **Viewer:** Read-only access to documents

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Clerk

1. Create a [Clerk](https://clerk.com) application
2. Copy your **Publishable Key** and **Secret Key** from the Clerk dashboard
3. Create a JWT template for Convex:
   - Go to **JWT Templates** in Clerk dashboard
   - Create a new template named "convex"
   - Set the **Issuer** to your Clerk Frontend API URL
   - Set the **Audience** to `convex`

### 3. Set up Convex

```bash
npx convex dev
```

This will prompt you to log in and create a new project. It generates the `convex/_generated/` directory.

### 4. Configure environment variables

Fill in `.env.local` with your values:

```
NEXT_PUBLIC_CONVEX_URL=<from npx convex dev output>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<from Clerk dashboard>
CLERK_SECRET_KEY=<from Clerk dashboard>
```

Set these in the **Convex dashboard** (Settings > Environment Variables):

```
CLERK_JWT_ISSUER_DOMAIN=<your Clerk Frontend API URL, e.g. https://your-app.clerk.accounts.dev>
CLERK_WEBHOOK_SECRET=<from Clerk webhook setup>
```

### 5. Set up Clerk webhook

1. In Clerk dashboard, go to **Webhooks**
2. Create an endpoint pointing to: `<your-convex-deployment-url>/clerk-webhook`
3. Subscribe to events: `user.created`, `user.updated`, `user.deleted`
4. Copy the **Signing Secret** and set it as `CLERK_WEBHOOK_SECRET` in Convex environment variables

### 6. Run the app

In two separate terminals:

```bash
npm run dev          # Next.js frontend
npm run dev:convex   # Convex backend
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
convex/                    # Convex backend
  schema.ts                # Database schema
  auth.config.ts           # Clerk auth configuration
  users.ts                 # User sync from Clerk
  teams.ts                 # Team CRUD + member management
  documents.ts             # Document CRUD
  documentVersions.ts      # Version control + file storage
  http.ts                  # Webhook endpoint
  lib/permissions.ts       # RBAC helpers

src/app/                   # Next.js pages
  page.tsx                 # Landing page
  dashboard/               # User dashboard
  teams/new/               # Create team
  teams/[teamId]/          # Team documents
  teams/[teamId]/settings/ # Team member management
  documents/[documentId]/  # Document detail + version history
  sign-in/, sign-up/       # Auth pages

src/components/            # React components
  providers.tsx            # Convex + Clerk providers
  navbar.tsx               # Navigation bar
  team-card.tsx            # Team card for dashboard
  document-table.tsx       # Documents list with actions
  upload-dialog.tsx        # File upload modal
  version-history.tsx      # Version timeline
  member-manager.tsx       # Team member management
  role-badge.tsx           # Role display badge
```
