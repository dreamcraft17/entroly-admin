# ENTROPI Admin Panel

Internal operations dashboard for the ENTROPI AI Video Factory platform.
Built with Next.js 14, TypeScript, Tailwind CSS, and PostgreSQL via Prisma.

**URL:** `https://admin.entro.ly`
**Access:** Internal team only — ENTROPI Operators and Admins

---

## What Is This?

The Admin Panel is the control center for ENTROPI's operations team. It is **not** a creator-facing product — it is the backend tooling used to configure, manage, and launch everything that creators eventually interact with.

Before any creator can generate an AI video or participate in a campaign, an operator must first set up the content infrastructure through this panel.

---

## Who Uses It

| Role | What They Can Do |
|---|---|
| `VIEWER` | Read-only access to all data |
| `OPERATOR` | Create, edit, upload, manage campaigns and content |
| `ADMIN` | All operator actions + user management |
| `SUPER_ADMIN` | Full access — all of the above |

Every write action is recorded in the **Audit Log** with the operator's identity, timestamp, IP address, and before/after state.

---

## Modules

### 1. Templates (`/admin/templates`)

Templates are the AI video blueprints. Each template defines how the Seedance 2.0 AI engine should generate a TikTok GO video for a specific Point of Interest category.

**Fields:**
| Field | Description |
|---|---|
| Name | Internal identifier for the template |
| Category | POI type this template targets: `ACC` (accommodation), `TTD` (tourism), `FNB` (food & beverage), `GENERAL` |
| Seedance Config JSON | Full AI generation config — must include `variation_params`. Controls style, duration, aspect ratio, motion level, and more |
| Fallback Vendor Config | Optional backup AI vendor config if Seedance is unavailable |
| Sample Thumbnail URL | Preview image shown to creators before generating |
| Performance Tags | Labels like `trending`, `outdoor`, `nightlife` used for matching and filtering |
| Performance Score | 0–100 internal quality score updated over time based on results |

**Actions:** Create → Edit → Archive (soft delete, data retained)

**Example Seedance Config:**
```json
{
  "variation_params": {
    "style_variation": ["cinematic", "vibrant"],
    "motion_speed": "medium"
  },
  "style": "tiktok_go",
  "duration_sec": 15,
  "aspect_ratio": "9:16",
  "resolution": "1080p",
  "motion_level": "medium"
}
```

---

### 2. Script Library (`/admin/scripts`)

A bank of proven TikTok GO narration scripts. The AI video engine pulls from this library when generating voice-over or caption text for creator videos.

**Fields:**
| Field | Description |
|---|---|
| Text | The script content (max 500 characters) |
| POI Type | `ACC`, `TTD`, or `FNB` |
| Language | `id` (Indonesian), `en` (English), `zh` (Mandarin) |
| Market | `IDN`, `US`, or `SGP` |

Scripts are tagged by language and market so the AI matches the right script to the right creator audience.

**Actions:** Create → Edit → Delete (hard delete)

---

### 3. POI Upload (`/admin/pois`)

POI (Point of Interest) is the database of venues — restaurants, hotels, tourist spots — that TikTok GO campaigns target. The list is maintained by uploading a CSV or XLSX file.

**Upload flow (dry-run first):**
1. Prepare a `.csv` or `.xlsx` file with columns: `externalId, name, type, market, address, city`
2. Upload the file → system shows a **dry-run diff** without writing anything:
   - **Added** — new POIs not yet in the database
   - **Updated** — existing POIs with changed data
   - **Deactivated** — POIs in the database but missing from the file
   - **Errors** — rows with invalid or missing data
3. Review the diff, then click **Confirm & Commit** to apply all changes in a single transaction

The commit is **idempotent** — submitting the same file twice will not create duplicate entries.

**CSV format:**
```
externalId,name,type,market,address,city
POI001,Starbucks Sudirman,FNB,IDN,Jl. Sudirman No.1,Jakarta
POI002,Bali Safari Park,TTD,IDN,Jl. Bypass Prof. Ida Bagus,Gianyar
POI003,The Ritz-Carlton,ACC,US,1228 Ocean Ave,Los Angeles
```

**Valid values:**
- `type`: `ACC`, `TTD`, `FNB`
- `market`: `IDN`, `US`, `SGP`

---

### 4. Campaigns (`/admin/campaigns`)

Campaigns are the briefs that creators participate in. An operator creates a campaign specifying what content is needed, how many posts, and what reward creators earn per approved post.

**Fields:**
| Field | Description |
|---|---|
| Name | Campaign title |
| Description | Brief for creators |
| Target POI Types | Which POI categories this campaign covers |
| Required Posts | Minimum posts a creator must submit |
| Credit Reward | Amount paid per approved post (DECIMAL 18,4) |
| Currency | `IDR` or `USD` |
| Start / End Date | Campaign active window |
| Max Participants | Optional cap on creator count |
| Budget Cap | Optional total credit ceiling — campaign auto-closes when reached |
| Frequency | `ONE_TIME`, `WEEKLY`, or `MONTHLY` |
| Auto-publish | If enabled, campaign activates automatically when start date arrives |

**Status lifecycle:**
```
DRAFT → ACTIVE → PAUSED → ACTIVE → CLOSED
         ↑_______________|
```

- `DRAFT` → `ACTIVE`: Publish manually or via auto-publish cron
- `ACTIVE` → `PAUSED`: Temporarily halt new participation
- `PAUSED` → `ACTIVE`: Resume
- Any → `CLOSED`: Permanent close (cannot reopen)

**Auto-publish & recurring logic (cron):**

A cron job hits `POST /api/admin/campaigns/cron` (protected by `CRON_SECRET`) and performs:
1. **Auto-publish** — activates DRAFT campaigns whose start date has arrived and `autoPublish = true`
2. **Budget cap close** — closes ACTIVE campaigns where `totalCredited >= maxTotalCredits`
3. **Spawn next cycle** — for WEEKLY/MONTHLY campaigns that ended, creates the next cycle automatically

Set up a systemd timer or cron job to call this endpoint daily:
```bash
curl -X POST https://admin.entro.ly/api/admin/campaigns/cron \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

---

## API Reference

Full OpenAPI 3.0 spec available at:
```
GET https://admin.entro.ly/api/openapi
```

All API routes are under `/api/admin/` and require authentication via the `admin_token` cookie (HS256 JWT) or `Authorization: Bearer <token>` header (RS256 JWT from SSO).

**Quick reference:**

| Method | Path | Min Role | Description |
|---|---|---|---|
| GET | `/api/admin/templates` | VIEWER | List templates |
| POST | `/api/admin/templates` | OPERATOR | Create template |
| PUT | `/api/admin/templates/:id` | OPERATOR | Update template |
| PATCH | `/api/admin/templates/:id/archive` | OPERATOR | Archive template |
| GET | `/api/admin/scripts` | VIEWER | List scripts |
| POST | `/api/admin/scripts` | OPERATOR | Create script |
| PUT | `/api/admin/scripts/:id` | OPERATOR | Update script |
| DELETE | `/api/admin/scripts/:id` | OPERATOR | Delete script |
| GET | `/api/admin/pois` | VIEWER | List POIs |
| POST | `/api/admin/pois/upload` | OPERATOR | Dry-run CSV/XLSX |
| POST | `/api/admin/pois/upload/commit` | OPERATOR | Commit changes |
| GET | `/api/admin/campaigns` | VIEWER | List campaigns |
| POST | `/api/admin/campaigns` | OPERATOR | Create campaign |
| PUT | `/api/admin/campaigns/:id` | OPERATOR | Update campaign |
| PATCH | `/api/admin/campaigns/:id` | OPERATOR | Status transition |
| POST | `/api/admin/campaigns/cron` | CRON_SECRET | Auto-publish + budget cap |

---

## Architecture

```
admin.entro.ly (Next.js 14 App Router)
├── Middleware          → auth guard on all routes (httpOnly JWT cookie)
├── /admin/*            → server + client components (UI)
├── /api/admin/*        → API routes (Zod validation + RBAC + AuditLog)
├── /api/auth/login     → issues HS256 JWT, sets httpOnly cookie
├── /api/auth/logout    → clears cookie
└── /api/openapi        → OpenAPI 3.0 spec (JSON)

Database: PostgreSQL (shared `entroly` DB)
ORM: Prisma 7 with @prisma/adapter-pg
```

**Financial rules enforced:**
- All `creditReward` and `maxTotalCredits` stored as `DECIMAL(18,4)` — never Float
- Currency always stored as ISO 4217 code (`IDR`, `USD`)
- No direct DB writes from frontend — all mutations go through API routes

---

## Infrastructure (D-03)

Terraform configs in `infra/terraform/`:

| Resource | Details |
|---|---|
| S3 `videos-idn` | ap-southeast-1, 7-day lifecycle |
| S3 `videos-us` | us-east-1, 7-day lifecycle |
| CloudFront | IDN primary + US failover origin group, PriceClass_200 |
| ElastiCache Redis | ap-southeast-1, AOF persistence, for BullMQ job queue |
| IAM `video-uploader` | Least-privilege: PutObject/GetObject/DeleteObject on both buckets |

Deploy infra:
```bash
cd infra/terraform
terraform init
terraform plan -var="vpc_id=vpc-xxx" -var='private_subnet_ids=["subnet-xxx"]'
terraform apply
```

After apply, add outputs to `.env`:
```bash
terraform output cloudfront_domain_name   # → NEXT_PUBLIC_CDN_URL
terraform output redis_endpoint           # → REDIS_URL
terraform output video_uploader_access_key_id     # → AWS_ACCESS_KEY_ID
terraform output video_uploader_secret_access_key # → AWS_SECRET_ACCESS_KEY
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list.

Required before first run:
```
DATABASE_URL
ADMIN_JWT_SECRET     # openssl rand -base64 32
JWT_PUBLIC_KEY       # RS256 public key from SSO
CRON_SECRET          # openssl rand -hex 32
NODE_ENV
```

---

## What Comes Next (Phase 2+)

This panel currently covers **Phase 1 Foundation** only. Future admin modules to be built:

- **Task Engine** — review and approve creator video submissions
- **Wallet Management** — view and manage creator credit balances
- **User Verification** — manage `creator_verified` status (required for FastPay/Cash Advance)
- **Audit Log Viewer** — UI to browse `AdminAuditLog` history
- **Analytics Dashboard** — campaign performance, video completion rates
