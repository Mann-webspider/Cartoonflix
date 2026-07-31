# CartoonFlix

A Netflix-style streaming platform for animated content — built as a **cost-aware, event-driven, serverless** system. Raw uploads are transcoded into adaptive-bitrate HLS by **ephemeral compute that only exists while a job runs**, then delivered through CloudFront with time-limited signed URLs.

> No always-on servers. No message broker to babysit. Transcoding runs on-demand in the cloud **or** on your own laptop from the same container image.

---

## Architecture

```mermaid
flowchart TB
    subgraph Client
        AF[Admin App<br/>Next.js]
        UF[Viewer App<br/>Next.js]
    end

    subgraph Edge / API
        APIGW[API Gateway<br/>HTTP API]
        CF[CloudFront<br/>signed URLs]
    end

    subgraph Serverless Backend
        ADM[Admin API<br/>Lambda · Node]
        USR[User API<br/>Lambda · Go/Fiber]
        ORCH[Transcode Orchestrator<br/>Lambda]
        DONE[Completion Handler<br/>Lambda]
    end

    subgraph Storage
        S3RAW[(S3 · raw uploads)]
        S3HLS[(S3 · HLS output)]
        DB[(MongoDB Atlas<br/>serverless)]
    end

    subgraph Transcode · ephemeral
        SQS[SQS + DLQ]
        FAR[Fargate task<br/>ffmpeg/HLS container<br/>spun per job, then exits]
        LOCAL[Local worker<br/>same image on laptop]
    end

    AF -->|presigned PUT| S3RAW
    AF --> APIGW
    UF --> APIGW
    APIGW --> ADM
    APIGW --> USR
    ADM --> DB
    USR --> DB
    S3RAW -- ObjectCreated event --> ORCH --> SQS --> FAR
    FAR -->|download raw| S3RAW
    FAR -->|upload HLS| S3HLS
    FAR -->|job done| DONE --> DB
    LOCAL -->|download raw| S3RAW
    LOCAL -->|upload HLS| S3HLS
    LOCAL -->|mark ready| ADM
    UF -->|playback| CF --> S3HLS
    USR -->|sign URL| CF
```

### How transcoding works

Two interchangeable paths run **the same container image**:

| Path | Trigger | Compute | Cost |
|------|---------|---------|------|
| **Cloud** | S3 `ObjectCreated` → orchestrator Lambda → SQS → `ecs RunTask` | Fargate task, exits when done | Pay only per job second |
| **Local** | `make transcode VIDEO=<id>` on your machine | Your laptop (CPU or CUDA auto-detect) | Free |

Both write HLS to the same S3 layout, so cloud and local are drop-in swappable. SQS gives retries + a dead-letter queue; no long-lived RabbitMQ broker.

---

## Tech stack

- **Frontend:** Next.js (admin dashboard + viewer app), Tailwind, HLS.js
- **APIs:** Node/Express (admin) + Go/Fiber (user) — both deployed as Lambda behind API Gateway
- **Media:** FFmpeg → adaptive-bitrate HLS, delivered via CloudFront signed URLs
- **Data:** MongoDB Atlas (serverless)
- **Messaging:** S3 events + SQS (+ DLQ)
- **Infra:** Terraform (modular) — S3, CloudFront, ECS/Fargate, ECR, Lambda, SQS, API Gateway, IAM
- **CI/CD:** GitHub Actions (lint/test → build/push images → `terraform plan`/`apply`)

---

## Repository layout

```
cartoonflix/
├── frontend/         # Next.js admin dashboard
├── user-frontend/    # Next.js viewer app
├── admin-backend/    # Node/Express content-management API
├── user-backend/     # Go/Fiber viewer API + CloudFront signing
├── ffmpeg-service/   # FFmpeg HLS transcode worker (cloud + local)
├── infra/            # Terraform IaC
└── .github/workflows # CI/CD
```

---

## Local development

Each service has a `.env.example` — copy to `.env` and fill in. Secrets (Mongo URI, CloudFront private key, AWS creds) never live in the repo.

```bash
# admin API
cd admin-backend && npm install && npm run dev
# user API
cd user-backend && go run ./cmd
# viewer / admin apps
cd user-frontend && npm install && npm run dev

# transcode a video locally (same pipeline as the cloud), then mark it ready
cd ffmpeg-service && npm install
make transcode KEY=<contentId>/source.mp4 CONTENT=<contentId>
```

## Deploy

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # fill in values
terraform init && terraform plan && terraform apply
```

---

## Roadmap

- [x] Phase 1 — security hardening, monorepo cleanup, key rotation
- [x] Phase 2 — Terraform infra + CI/CD
- [x] Phase 3 — serverless API (admin + user Lambdas) + on-demand/local transcode pipeline
- [x] Phase 4a — JWT auth (users/admins), schema redesign (users, watch history), search, CloudWatch dashboard + DLQ alarm
- [ ] Phase 4b — viewer UI buildout, admin dashboard polish, recommendations
