# DocVault — Java Backend Conversion Agent Prompt

## Overview

You are converting **DocVault** from a Next.js + Convex + Clerk stack to a **Next.js + Spring Boot (Java) + PostgreSQL + Clerk** stack. The frontend UI, pages, routes, and Playwright tests are kept intact — only the backend data layer and the frontend hooks/API clients change.

**Do not stop until all of the following are true:**
1. `mvn spring-boot:run` starts the Java API on port 8080 with no errors.
2. `npm run dev` starts the Next.js frontend on port 3000 with no errors.
3. `npx playwright test` passes at minimum the same tests that pass today (see Baseline section).
4. No TypeScript compiler errors (`npx tsc --noEmit`).

---

## Baseline Test Results (pre-existing state)

Run `npx playwright test` against the Convex version before touching anything. The tests below are expected to **pass** after the conversion. Tests in the "Pre-existing failures" section were already failing before conversion and do not need to pass.

### Must pass after conversion (21 tests currently passing)

| Test ID | File | Description |
|---------|------|-------------|
| AUTH-01 | `e2e/auth.spec.ts` | Authenticated user can access `/dashboard` |
| DASH-01 | `e2e/dashboard.spec.ts` | Dashboard loads and shows teams or empty state |
| DASH-02 | `e2e/dashboard.spec.ts` | New Team button links to `/teams/new` |
| ERR-01 | `e2e/error-handling.spec.ts` | Invalid team ID shows meaningful error |
| ERR-02 | `e2e/error-handling.spec.ts` | Invalid document ID shows meaningful error |
| ERR-03 | `e2e/error-handling.spec.ts` | App recovers from error without full-page crash |
| NAV-01 | `e2e/navigation.spec.ts` | Landing page shows Get Started and Sign In links |
| NAV-02 | `e2e/navigation.spec.ts` | Navbar shows Dashboard link when signed in |
| NAV-03 | `e2e/navigation.spec.ts` | Back button on team page navigates to dashboard |
| BASE-01 | `e2e/accessibility.spec.ts` | html element has lang attribute |
| BASE-03 | `e2e/accessibility.spec.ts` | Interactive elements are keyboard-focusable |
| EDGE-01 | `e2e/edge-cases.spec.ts` | Empty team name is rejected |
| (audit duplicates of above) | `e2e/audit-*.spec.ts` | Mirror specs |

### Pre-existing failures (do NOT need to pass — document as known issues)

| Test ID | Reason |
|---------|--------|
| AUTH-02, SEC-01, SEC-02 | Clerk redirects to external domain (`accounts.dev`), test checks for `/sign-in` in URL |
| SEC-03 | Storage URLs are public — intentionally documents desired future behavior |
| TEAM-01 | Team name heading not visible after creation (5s timeout) — Convex real-time race |
| DOC-01 | Document creation dialog times out waiting for Convex response |
| EDGE-02 | Empty document name not rejected by current UI |
| BASE-02 | Some pages missing an `<h1>` element |
| security-roles setup, accessibility-audit setup | Cascade from TEAM-01/DOC-01 failures |

---

## Architecture Decisions (do not deviate from these)

| Concern | Decision |
|---------|----------|
| Java framework | **Spring Boot 3.3** (Spring Web MVC, Spring Data JPA, Spring Security) |
| Build tool | **Maven** (`pom.xml`) |
| Database | **PostgreSQL 15** — run via Docker (`docker-compose.yml` provided below) |
| File storage | **Local filesystem** at `./uploads/` (configure via `STORAGE_PATH` env var) |
| Auth | **Clerk** — Spring Security validates Clerk JWTs; Clerk webhook handled in Java |
| Real-time updates | **None** — remove Convex real-time. Frontend uses `@tanstack/react-query` to refetch after mutations. No WebSocket layer needed. |
| API style | **REST JSON API** on `http://localhost:8080/api/` |
| Frontend API client | Replace all Convex `useQuery`/`useMutation` hooks with React Query `useQuery`/`useMutation` + `fetch` calls |
| Email | **Resend** HTTP API called from Java (no SDK needed — use `RestTemplate` or `HttpClient`) |

---

## Project Structure to Create

```
/                           (repo root — existing Next.js project)
├── backend/                (NEW — Java/Spring Boot project)
│   ├── pom.xml
│   ├── src/main/java/com/docvault/
│   │   ├── DocVaultApplication.java
│   │   ├── config/
│   │   │   ├── SecurityConfig.java       (JWT + Clerk JWKS)
│   │   │   ├── WebConfig.java            (CORS)
│   │   │   └── StorageConfig.java        (file storage path)
│   │   ├── controller/
│   │   │   ├── UserController.java
│   │   │   ├── TeamController.java
│   │   │   ├── DocumentController.java
│   │   │   ├── DocumentVersionController.java
│   │   │   ├── InviteController.java
│   │   │   └── WebhookController.java
│   │   ├── service/
│   │   │   ├── UserService.java
│   │   │   ├── TeamService.java
│   │   │   ├── DocumentService.java
│   │   │   ├── DocumentVersionService.java
│   │   │   ├── InviteService.java
│   │   │   └── EmailService.java
│   │   ├── repository/
│   │   │   ├── UserRepository.java
│   │   │   ├── TeamRepository.java
│   │   │   ├── TeamMemberRepository.java
│   │   │   ├── DocumentRepository.java
│   │   │   ├── DocumentVersionRepository.java
│   │   │   └── InviteRepository.java
│   │   ├── entity/
│   │   │   ├── User.java
│   │   │   ├── Team.java
│   │   │   ├── TeamMember.java
│   │   │   ├── Document.java
│   │   │   ├── DocumentVersion.java
│   │   │   └── Invite.java
│   │   ├── dto/                          (request/response DTOs)
│   │   └── exception/
│   │       ├── ResourceNotFoundException.java
│   │       └── ForbiddenException.java
│   └── src/main/resources/
│       └── application.yml
├── docker-compose.yml      (NEW — Postgres container)
├── src/                    (existing Next.js source — modified)
│   ├── lib/
│   │   └── api.ts          (NEW — typed fetch client for the Java API)
│   └── ...existing files (components modified to use React Query)
└── ...existing config files
```

---

## Database Schema (PostgreSQL DDL)

Derived from `convex/schema.ts`. All IDs are `UUID` generated by the database.

```sql
-- Users (synced from Clerk via webhook and on first login)
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id    VARCHAR(255) NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    image_url   VARCHAR(1000),
    created_at  BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- Teams
CREATE TABLE teams (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  BIGINT NOT NULL
);

-- Team Members (role: admin | editor | viewer)
CREATE TABLE team_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id     UUID NOT NULL REFERENCES teams(id),
    user_id     UUID NOT NULL REFERENCES users(id),
    role        VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    joined_at   BIGINT NOT NULL,
    UNIQUE (team_id, user_id)
);

-- Documents
CREATE TABLE documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    team_id     UUID NOT NULL REFERENCES teams(id),
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  BIGINT NOT NULL,
    updated_at  BIGINT NOT NULL
);

-- Document Versions (each version is a stored file)
CREATE TABLE document_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(id),
    storage_path    VARCHAR(1000) NOT NULL,  -- relative path under STORAGE_PATH
    version_number  INT NOT NULL,
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    comment         VARCHAR(1000),
    file_name       VARCHAR(500) NOT NULL,
    file_type       VARCHAR(255) NOT NULL,
    file_size       BIGINT NOT NULL,
    created_at      BIGINT NOT NULL
);

-- Invites (pending email invitations)
CREATE TABLE invites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id     UUID NOT NULL REFERENCES teams(id),
    email       VARCHAR(255) NOT NULL,
    role        VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    invited_by  UUID NOT NULL REFERENCES users(id),
    status      VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled')),
    created_at  BIGINT NOT NULL
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_documents_team_id ON documents(team_id);
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_invites_team_id ON invites(team_id);
CREATE INDEX idx_invites_email_status ON invites(email, status);
```

Use **Flyway** for schema migrations (add as Maven dependency). Place the DDL above in `src/main/resources/db/migration/V1__initial_schema.sql`.

---

## Full REST API Contract

Base URL: `http://localhost:8080/api`

All endpoints except `POST /api/webhooks/clerk` require a valid Clerk JWT in `Authorization: Bearer <token>`.

### Authentication / Users

| Method | Path | Auth | Body | Response | Description |
|--------|------|------|------|----------|-------------|
| POST | `/api/users/sync` | JWT | `{}` | `UserDto` | Upsert user from JWT claims. Accept pending invites. Replaces `users.ensureUser`. |
| GET | `/api/users/me` | JWT | — | `UserDto` | Current user. Replaces `users.currentUser`. |

**`UserDto`**:
```json
{ "id": "uuid", "clerkId": "...", "email": "...", "name": "...", "imageUrl": "..." }
```

### Teams

| Method | Path | Auth | Body | Response | Description |
|--------|------|------|------|----------|-------------|
| POST | `/api/teams` | JWT | `{"name":"string"}` | `TeamDto` | Create team + add caller as admin. |
| GET | `/api/teams` | JWT | — | `TeamDto[]` | List caller's teams with their role. |
| GET | `/api/teams/{teamId}` | JWT | — | `TeamDto` | Get single team (caller must be member). |
| GET | `/api/teams/{teamId}/members` | JWT | — | `TeamMemberDto[]` | All members with user info. |
| POST | `/api/teams/{teamId}/members` | JWT (admin) | `{"email":"string","role":"admin\|editor\|viewer"}` | `{"result":"added\|invited"}` | Add member or create invite + send email. |
| PATCH | `/api/teams/{teamId}/members/{memberId}` | JWT (admin) | `{"role":"admin\|editor\|viewer"}` | `TeamMemberDto` | Update role. |
| DELETE | `/api/teams/{teamId}/members/{memberId}` | JWT (admin) | — | `204` | Remove member (cannot remove creator). |
| DELETE | `/api/teams/{teamId}` | JWT (admin + creator) | — | `204` | Delete team cascade (members, invites, documents, files). |

**`TeamDto`**:
```json
{ "id": "uuid", "name": "...", "createdBy": "userId", "createdAt": 1700000000000, "role": "admin" }
```

**`TeamMemberDto`**:
```json
{ "id": "uuid", "teamId": "uuid", "userId": "uuid", "role": "editor", "joinedAt": 1700000000000, "user": { "id": "...", "name": "...", "email": "...", "imageUrl": "..." } }
```

### Documents

| Method | Path | Auth | Body | Response | Description |
|--------|------|------|------|----------|-------------|
| POST | `/api/teams/{teamId}/documents` | JWT (admin\|editor) | `{"name":"string"}` | `DocumentDto` | Create document. |
| GET | `/api/teams/{teamId}/documents` | JWT (member) | — | `DocumentListItemDto[]` | List docs with latestVersion + versionCount. |
| GET | `/api/documents/{documentId}` | JWT (member) | — | `DocumentDetailDto` | Get doc with creator info + caller's role. |
| PATCH | `/api/documents/{documentId}` | JWT (admin\|editor) | `{"name":"string"}` | `DocumentDto` | Rename document. |
| DELETE | `/api/documents/{documentId}` | JWT (admin) | — | `204` | Delete doc + all versions + files. |

**`DocumentListItemDto`**:
```json
{
  "id": "uuid", "name": "...", "teamId": "uuid", "createdBy": "uuid",
  "createdAt": 1700000000000, "updatedAt": 1700000000000,
  "creator": { "id": "...", "name": "..." },
  "latestVersion": { "id": "...", "versionNumber": 2, "fileName": "...", "fileSize": 12345, "createdAt": 1700000000000 },
  "versionCount": 2
}
```

**`DocumentDetailDto`**:
```json
{
  "id": "uuid", "name": "...", "teamId": "uuid", "createdBy": "uuid",
  "createdAt": 1700000000000, "updatedAt": 1700000000000,
  "creator": { "id": "...", "name": "...", "imageUrl": "..." },
  "role": "admin"
}
```

### Document Versions

| Method | Path | Auth | Body | Response | Description |
|--------|------|------|------|----------|-------------|
| POST | `/api/documents/{documentId}/versions` | JWT (admin\|editor) | `multipart/form-data`: `file` + `comment?` | `DocumentVersionDto` | Upload file, store on disk, create version row. Auto-increments `versionNumber`. Updates document `updatedAt`. |
| GET | `/api/documents/{documentId}/versions` | JWT (member) | — | `DocumentVersionDto[]` | List versions desc by versionNumber. |
| GET | `/api/documents/{documentId}/versions/{versionId}/download` | JWT (member) | — | File stream | Download file. Set `Content-Disposition: attachment; filename="..."` and `Content-Type` from stored `fileType`. **Auth required** (this fixes SEC-H2). |

**`DocumentVersionDto`**:
```json
{
  "id": "uuid", "documentId": "uuid", "versionNumber": 1,
  "uploadedBy": "uuid", "comment": "Initial upload",
  "fileName": "report.pdf", "fileType": "application/pdf", "fileSize": 102400,
  "createdAt": 1700000000000,
  "uploader": { "id": "...", "name": "..." }
}
```

### Invites

| Method | Path | Auth | Body | Response | Description |
|--------|------|------|------|----------|-------------|
| GET | `/api/teams/{teamId}/invites` | JWT (member) | — | `InviteDto[]` | List pending invites. |
| DELETE | `/api/teams/{teamId}/invites/{inviteId}` | JWT (admin) | — | `204` | Cancel pending invite. |

**`InviteDto`**:
```json
{ "id": "uuid", "teamId": "uuid", "email": "...", "role": "viewer", "invitedByName": "...", "status": "pending", "createdAt": 1700000000000 }
```

### Webhooks

| Method | Path | Auth | Body | Response | Description |
|--------|------|------|------|----------|-------------|
| POST | `/api/webhooks/clerk` | Svix signature | Clerk event JSON | `200 OK` | Handle `user.created`, `user.updated`, `user.deleted`. Verify with `CLERK_WEBHOOK_SECRET` using `com.svix.Webhook`. |

---

## RBAC Rules

Replicate these exactly in service layer authorization checks:

| Operation | Required Role | Extra constraint |
|-----------|--------------|-----------------|
| List team members | any member | — |
| List pending invites | any member | — |
| List documents | any member | — |
| Get document | any member | — |
| List versions | any member | — |
| Create document | admin or editor | — |
| Upload version | admin or editor | — |
| Rename document | admin or editor | — |
| Add member | admin | — |
| Update member role | admin | — |
| Cancel invite | admin | — |
| Remove member | admin | Cannot remove team creator |
| Delete document | admin | — |
| Delete team | admin | **And** caller must be `team.createdBy` |

Throw `403 Forbidden` with a descriptive message for authorization failures.
Throw `404 Not Found` for missing resources.

---

## Cross-Cutting Behaviors (critical to replicate)

### 1. User sync on first login (`POST /api/users/sync`)
When a user calls this endpoint:
1. Look up user by `clerkId` (extracted from JWT `sub` claim).
2. If exists: update `email`, `name`, `imageUrl` from JWT claims.
3. If new: insert user. Then find all `invites` where `email = user.email` AND `status = 'pending'`. For each: insert a `team_members` row with the invite's `role`, mark the invite `accepted`.

### 2. Invite flow in `POST /api/teams/{teamId}/members`
1. Check if a user with that email already exists in `users` table.
   - **Yes**: Insert `team_members` directly. Return `{"result":"added"}`.
   - **No**: Check for existing pending invite for same `(teamId, email)`. If exists: return `400 "An invite has already been sent to this email"`. Else: insert invite, send email via EmailService. Return `{"result":"invited"}`.

### 3. Cascade deletes
- `DELETE /api/teams/{teamId}`: Delete team_members → invites → (for each document: delete files from disk, delete document_versions) → documents → team.
- `DELETE /api/documents/{documentId}`: Delete files from disk, delete document_versions → document.

### 4. File storage
- Store uploaded files at `${STORAGE_PATH}/${teamId}/${documentId}/${versionId}_${originalFilename}`.
- `STORAGE_PATH` defaults to `./uploads` (relative to working directory).
- Create directories as needed. Do not expose raw filesystem paths in API responses.
- Download endpoint streams file with proper headers. Enforce JWT auth on download.

---

## Spring Boot Configuration (`backend/src/main/resources/application.yml`)

```yaml
server:
  port: 8080

spring:
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/docvault}
    username: ${DATABASE_USER:docvault}
    password: ${DATABASE_PASSWORD:docvault}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
  flyway:
    enabled: true
    locations: classpath:db/migration

clerk:
  jwks-uri: ${CLERK_JWKS_URI}         # e.g. https://touched-pony-8.clerk.accounts.dev/.well-known/jwks.json
  webhook-secret: ${CLERK_WEBHOOK_SECRET}

storage:
  path: ${STORAGE_PATH:./uploads}

resend:
  api-key: ${RESEND_API_KEY:}
  from-email: ${RESEND_FROM_EMAIL:DocVault <onboarding@resend.dev>}

app:
  url: ${APP_URL:http://localhost:3000}
  cors-origins: ${CORS_ORIGINS:http://localhost:3000}
```

---

## `docker-compose.yml` (place in repo root)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: docvault
      POSTGRES_USER: docvault
      POSTGRES_PASSWORD: docvault
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Maven `pom.xml` Dependencies

```xml
<dependencies>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-oauth2-resource-server</artifactId></dependency>
  <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId><scope>runtime</scope></dependency>
  <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-core</artifactId></dependency>
  <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-database-postgresql</artifactId></dependency>
  <dependency><groupId>com.svix</groupId><artifactId>svix</artifactId><version>1.4.0</version></dependency>
  <dependency><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId><optional>true</optional></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-test</artifactId><scope>test</scope></dependency>
</dependencies>
```

---

## JWT / Security Config (Spring Security)

Use `spring-boot-starter-oauth2-resource-server` with Clerk's JWKS endpoint:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Value("${clerk.jwks-uri}") private String jwksUri;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.POST, "/api/webhooks/clerk").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwkSetUri(jwksUri))
            );
        return http.build();
    }
}
```

Extract the Clerk user identity in services/controllers using `SecurityContextHolder.getContext().getAuthentication()` which will be a `JwtAuthenticationToken`. The `sub` claim is the `clerkId`.

---

## Frontend Changes Required

### Remove Convex entirely

Remove from `package.json`:
- `convex`
- Delete `convex/` folder is NOT required (keep it as source reference)
- Remove `ConvexReactClient`, `ConvexProviderWithClerk` from `src/components/providers.tsx`

### Add React Query

```bash
npm install @tanstack/react-query
```

### New `src/lib/api.ts`

Create a typed fetch wrapper. Every request includes the Clerk JWT token obtained from `useAuth().getToken()`.

```typescript
// src/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api'

export async function apiFetch<T>(
  path: string,
  token: string | null,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(error || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}
```

### Update `src/components/providers.tsx`

Replace `ConvexProviderWithClerk` + `UserSync` with `QueryClientProvider` + a `UserSync` component that calls `POST /api/users/sync`:

```typescript
"use client"
import { ClerkProvider, useAuth } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { apiFetch } from "@/lib/api"

const queryClient = new QueryClient()

function UserSync() {
  const { isSignedIn, getToken } = useAuth()
  const hasSynced = useRef(false)

  useEffect(() => {
    if (isSignedIn && !hasSynced.current) {
      hasSynced.current = true
      getToken().then(token =>
        apiFetch('/users/sync', token, { method: 'POST', body: '{}' })
      ).catch(err => {
        hasSynced.current = false
        console.error("Failed to sync user:", err)
      })
    }
    if (!isSignedIn) hasSynced.current = false
  }, [isSignedIn, getToken])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark, variables: { colorBackground: "#000000", colorInputBackground: "#121212", colorPrimary: "#ededed" } }}>
      <QueryClientProvider client={queryClient}>
        <UserSync />
        {children}
      </QueryClientProvider>
    </ClerkProvider>
  )
}
```

### Update all page/component files that call Convex

For every component that currently uses `useQuery(api.X.Y, ...)` or `useMutation(api.X.Y)`, replace with React Query equivalents. Pattern:

**Before (Convex):**
```typescript
const teams = useQuery(api.teams.list)
const createTeam = useMutation(api.teams.create)
```

**After (React Query):**
```typescript
const { getToken } = useAuth()
const { data: teams } = useQuery({
  queryKey: ['teams'],
  queryFn: async () => {
    const token = await getToken()
    return apiFetch<TeamDto[]>('/teams', token)
  }
})
const { mutateAsync: createTeam } = useMutation({
  mutationFn: async (name: string) => {
    const token = await getToken()
    return apiFetch<TeamDto>('/teams', token, { method: 'POST', body: JSON.stringify({ name }) })
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] })
})
```

Files to update (replace Convex hooks):
- `src/app/dashboard/page.tsx` — `teams.list`
- `src/app/teams/new/page.tsx` — `teams.create`
- `src/app/teams/[teamId]/page.tsx` — `teams.get`, `documents.list`, `documents.create`, `documentVersions.generateUploadUrl` + `documentVersions.createVersion`
- `src/app/teams/[teamId]/settings/page.tsx` — `teams.get`, `teams.getMembers`, `teams.addMember`, `teams.updateMemberRole`, `teams.removeMember`, `teams.deleteTeam`, `invites.listPending`, `invites.cancel`
- `src/app/documents/[documentId]/page.tsx` — `documents.get`, `documentVersions.list`, `documentVersions.getDownloadUrl`, `documents.rename`, `documents.remove`, `documentVersions.createVersion`

### File Upload Flow Change

**Before (Convex 3-step):**
1. `generateUploadUrl` mutation → upload URL
2. `fetch(uploadUrl, { method: "PUT", body: file })`
3. `createVersion` mutation with `storageId`

**After (Java single-step multipart):**
1. `POST /api/documents/{documentId}/versions` with `multipart/form-data` (`file` field + optional `comment` field)

Update all upload dialogs (`upload-dialog.tsx`, etc.) to use the new single-step approach.

### Environment Variables

Add to `src/.env.local` (or `frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

Keep existing Clerk env vars (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, etc.) unchanged.

Remove from `.env.local`:
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CONVEX_SITE_URL`
- `CONVEX_DEPLOYMENT`

Add to `backend/.env` (or export before running):
```
DATABASE_URL=jdbc:postgresql://localhost:5432/docvault
DATABASE_USER=docvault
DATABASE_PASSWORD=docvault
CLERK_JWKS_URI=https://touched-pony-8.clerk.accounts.dev/.well-known/jwks.json
CLERK_WEBHOOK_SECRET=<from Clerk dashboard>
RESEND_API_KEY=<your key>
APP_URL=http://localhost:3000
STORAGE_PATH=./uploads
```

---

## Webhook Setup

After the Java backend is running, update the Clerk webhook endpoint in the Clerk Dashboard from `https://earnest-whale-916.convex.site/clerk-webhook` to `http://<your-public-url>:8080/api/webhooks/clerk` (or use `ngrok` for local development).

---

## Error Response Format

Return consistent JSON errors:

```json
{ "error": "Team not found", "status": 404 }
```

Use a `@ControllerAdvice` `GlobalExceptionHandler` that maps:
- `ResourceNotFoundException` → `404`
- `ForbiddenException` → `403`
- `IllegalArgumentException` → `400`
- Everything else → `500`

---

## Step-by-Step Execution Order

1. Create `docker-compose.yml` at repo root.
2. Run `docker-compose up -d` to start PostgreSQL.
3. Create `backend/` Maven project with all entities, repositories, services, and controllers.
4. Start the backend: `cd backend && mvn spring-boot:run`.
5. Verify all API endpoints work with `curl` or Postman.
6. Install `@tanstack/react-query` in the frontend.
7. Create `src/lib/api.ts`.
8. Update `src/components/providers.tsx`.
9. Update every component file that uses Convex hooks (list above).
10. Remove Convex package and update `.env.local`.
11. Run `npm run dev` and verify the UI works in the browser.
12. Run `npx playwright test` and confirm baseline tests pass.
13. Run `npx tsc --noEmit` and fix any TypeScript errors.

---

## Acceptance Criteria Checklist

- [ ] `docker-compose up -d` starts PostgreSQL successfully
- [ ] `cd backend && mvn spring-boot:run` starts with no errors
- [ ] `POST /api/users/sync` returns the current user
- [ ] `POST /api/teams` creates a team and returns it
- [ ] `GET /api/teams` returns teams for the authenticated user
- [ ] `POST /api/teams/{teamId}/documents` creates a document
- [ ] `POST /api/documents/{documentId}/versions` uploads a file
- [ ] `GET /api/documents/{documentId}/versions/{versionId}/download` streams the file (auth required)
- [ ] `POST /api/webhooks/clerk` handles user.created and user.deleted events
- [ ] `npm run dev` starts with no errors (no Convex imports)
- [ ] `npx tsc --noEmit` shows zero errors
- [ ] `npx playwright test` passes AUTH-01, DASH-01, DASH-02, ERR-01–03, NAV-01–03
