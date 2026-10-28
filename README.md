<p align="center">
  <img src="docs/banner.png" alt="Vangari" width="180" />
</p>

<h1 align="center">Vangari — AI-Powered Waste Marketplace</h1>

<p align="center">
  <strong>Upload scrap. Get an instant AI appraisal. Summon a collector.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#environment-variables">Environment</a> •
  <a href="#api-reference">API</a> •
  <a href="#project-structure">Structure</a> •
  <a href="#license">License</a>
</p>

---

## Overview

**Vangari** is a full-stack, containerized marketplace that connects waste owners with certified collectors. Users upload photos of recyclable scrap — the platform's vision AI (**Google Gemma 4 31B** via OpenRouter) identifies material composition (iron, plastic, e-waste), estimates weight, calculates a fair payout based on live market rates, and dispatches the nearest geo-located collector with turn-by-turn routing.

## My Role

I'm on the **Data Science side** of this team project, built for **IDSOL 2026**. My part of the build started with the Module 1 foundation — setting up the dataset and the data pipeline the rest of the system builds on — before the team moved fast on the AI-assisted full-stack build you see here: an Express/PostgreSQL backend, a Next.js frontend, and a vision pipeline (Gemma 4 31B via OpenRouter) that turns a photo of scrap into a material breakdown, a fair payout estimate, and a dispatched collector.

This repo is my copy of the project, kept here alongside my other work.

---

## Features

| Category | Details |
|---|---|
| 🤖 **AI Material Analysis** | Multimodal vision model (Gemma 4 31B-IT) analyzes uploaded images and returns material percentages, estimated weight, and a confidence score |
| 💰 **Fair Market Pricing** | Payout calculated from database-driven market rates (per kg) with a transparent 20% platform commission |
| 🗺️ **Geo-Dispatching** | Finds the nearest collector using PostGIS spatial queries and generates OSRM road-network routes with Google Maps links |
| 📱 **SMS Notifications** | Dispatches pickup details to collectors via SMS (extensible provider architecture; MOCK provider for development) |
| 👤 **Role-Based Access** | Three roles — `OWNER`, `COLLECTOR`, `ADMIN` — each with dedicated dashboards and API permissions |
| 📊 **Admin Panel** | Full admin dashboard for user management, listing oversight, manual collector assignment, and payout tracking |
| 🧾 **Collector Payout Ledger** | Transparent payout formula (percentage + floor) with full audit trail |
| 📜 **Status History** | Every listing status transition is tracked with timestamps and actor attribution |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Nginx Gateway (:8000)             │
│         ┌──────────────┬──────────────┐              │
│         │  /api/*       │  /*          │              │
│         ▼              ▼              │              │
│   ┌──────────┐   ┌──────────┐        │              │
│   │ Express  │   │ Next.js  │        │              │
│   │ Backend  │   │ Frontend │        │              │
│   │ (:5000)  │   │ (:3000)  │        │              │
│   └────┬─────┘   └──────────┘        │              │
│        │                              │              │
│   ┌────▼─────────────────┐           │              │
│   │  PostGIS / PostgreSQL │           │              │
│   │      (:5432)          │           │              │
│   └───────────────────────┘           │              │
└─────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   ┌───────────┐       ┌───────────┐
   │ OpenRouter │       │   OSRM    │
   │ Gemma 4   │       │  Routing  │
   └───────────┘       └───────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| **Backend** | Node.js, Express 5, Multer (image uploads) |
| **Database** | PostgreSQL 15 + PostGIS 3.3 (spatial queries) |
| **AI Engine** | Google Gemma 4 31B-IT via OpenRouter (OpenAI-compatible API) |
| **Routing** | OSRM (Open Source Routing Machine) with Haversine fallback |
| **Auth** | JWT (jsonwebtoken) + bcryptjs |
| **Gateway** | Nginx (reverse proxy, 50MB upload limit) |
| **Containerization** | Docker Compose (4 services) |

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- An [OpenRouter](https://openrouter.ai/) API key

### 1. Clone

```bash
git clone https://github.com/prachyabiswas/Vangari-AI.git
cd Vangari-AI
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key-here
```

### 3. Launch

```bash
docker compose up --build -d
```

The application will be available at **http://localhost:8000**.

### 4. Default Accounts

The database is seeded with test accounts (password: `password123`):

| Role | Email | Purpose |
|---|---|---|
| Owner | `owner@example.com` | Upload scrap images, receive appraisals |
| Collector | `collector@example.com` | View & fulfill assigned pickups |
| Admin | `admin@example.com` | Manage users, listings, payouts |

---

## Environment Variables

### Root `.env` (Docker Compose)

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | ✅ | Your OpenRouter API key for Gemma 4 vision model |
| `HF_TOKEN` | ❌ | Hugging Face token (legacy, optional fallback) |

### Backend-Specific (set in `docker-compose.yml`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Express server port |
| `DATABASE_URL` | `postgres://postgres:root@db:5432/vangari` | PostgreSQL connection string |
| `ROUTE_API_URL` | `https://router.project-osrm.org` | OSRM routing API endpoint |
| `SMS_PROVIDER` | `MOCK` | SMS provider (`MOCK` for development) |
| `COLLECTOR_PAYOUT_PERCENT` | `0.12` | Collector payout percentage (12%) |
| `COLLECTOR_PAYOUT_FLOOR` | `30` | Minimum collector payout (BDT) |

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login — returns JWT |

### Waste (Protected)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/waste/analyze` | Upload images (multipart `images[]`, max 5) — returns AI analysis with material percentages, confidence, and payout estimate |
| `POST` | `/api/waste/dispatch/:listingId` | Dispatch nearest collector to a pending listing |
| `GET` | `/api/waste/owner/history` | Get owner's listing history and sale summary |
| `GET` | `/api/waste/collector/jobs` | Get collector's assigned/collected jobs with route info |
| `POST` | `/api/waste/collector/listings/:listingId/actual` | Submit actual collection breakdown |
| `POST` | `/api/waste/collector/listings/batch-actual` | Batch-submit multiple actual collections |

### Admin (Protected, Admin-only)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/users` | List all users |
| `GET` | `/api/admin/listings` | List all waste listings with details |
| `GET` | `/api/admin/payouts/collectors` | View collector payout ledger |
| `GET` | `/api/admin/listings/:id/collectors` | Get nearby collectors for a listing |
| `POST` | `/api/admin/listings/:id/assign` | Manually assign a collector to a listing |

### AI Analysis Response Shape

```json
{
  "success": true,
  "listing": { "id": "uuid", "estimated_payout": 125.60, "status": "PENDING", "..." : "..." },
  "ai_estimates": {
    "iron_percent": 80,
    "plastic_percent": 15,
    "electronics_percent": 5,
    "iron_kg": 2.0,
    "plastic_kg": 0.375,
    "electronics_kg": 0.125,
    "total_estimated_kg": 2.5,
    "confidence_score": 87,
    "biodegradable_present": false
  },
  "probable_waste_amount": 2.5
}
```

---

## Project Structure

```
vangari/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js      # Register & login logic
│   │   │   ├── wasteController.js     # AI analysis, dispatch, collection
│   │   │   └── adminController.js     # Admin CRUD operations
│   │   ├── middleware/
│   │   │   └── authMiddleware.js      # JWT verification
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── wasteRoutes.js
│   │   │   └── adminRoutes.js
│   │   ├── services/
│   │   │   ├── routingService.js      # OSRM routing + Haversine fallback
│   │   │   ├── smsService.js          # SMS dispatch with audit logging
│   │   │   └── payoutService.js       # Collector payout formula
│   │   ├── db.js                      # PostgreSQL connection pool
│   │   └── index.js                   # Express entry point
│   ├── Dockerfile
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # Home — upload & history
│   │   │   ├── auth/                  # Login & register pages
│   │   │   ├── collector/             # Collector dashboard
│   │   │   └── admin/                 # Admin dashboard
│   │   ├── components/
│   │   │   ├── UploadForm.tsx         # Image upload with location
│   │   │   ├── AnalysisResult.tsx     # AI results & dispatch UI
│   │   │   ├── OwnerHistory.tsx       # Owner listing history
│   │   │   ├── RouteMiniMap.tsx       # Route visualization
│   │   │   └── Header.tsx             # Navigation header
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # JWT auth state management
│   │   └── lib/
│   │       └── utils.ts               # Utility functions
│   ├── Dockerfile
│   └── package.json
├── db/
│   ├── schema.sql                     # Full database schema with PostGIS
│   ├── seed.sql                       # Test users & market rates
│   └── migration_phase1.sql           # Migration scripts
├── docker-compose.yml                 # 4-service orchestration
├── nginx.conf                         # Reverse proxy configuration
└── .env                               # Root environment variables
```

---

## Database Schema

The application uses **PostgreSQL 15** with the **PostGIS** extension for geospatial operations.

| Table | Purpose |
|---|---|
| `users` | User accounts with roles, password hashes, GPS coordinates, and contact info |
| `waste_listings` | Core entity — tracks lifecycle from upload → AI analysis → dispatch → collection → sale |
| `market_rates` | Material prices per kg (iron, plastic, electronics) |
| `collector_route_jobs` | Stores computed routes between collectors and waste owners |
| `sms_audit` | Full SMS dispatch log with provider tracking |
| `collector_payout_ledger` | Transparent collector payout calculations |
| `listing_status_history` | Immutable status transition audit trail |

### Market Rates (Seeded)

| Material | Price per kg (BDT) |
|---|---|
| Iron | ৳62.00 |
| Plastic | ৳12.00 |
| Electronics | ৳180.00 |

---

## AI Pipeline

```
Image Upload → Base64 Encoding → OpenRouter API (Gemma 4 31B-IT)
                                        │
                                        ▼
                                 JSON Response:
                              ┌─ iron_percent
                              ├─ plastic_percent
                              ├─ electronics_percent
                              ├─ total_estimated_kg
                              ├─ biodegradable_present
                              └─ confidence_score
                                        │
                                        ▼
                         Weight Derivation (% × total_kg)
                                        │
                                        ▼
                      Market Rate Lookup → Payout Calculation
```

If the AI model is unavailable (timeout, rate limit, etc.), the system falls back to safe defaults to ensure the UI never crashes.

---

## Development

### Run Locally (without Docker)

```bash
# Terminal 1 — Database
docker compose up db -d

# Terminal 2 — Backend
cd backend
cp .env.example .env  # Configure your API keys
npm install
node src/index.js

# Terminal 3 — Frontend
cd frontend
npm install
npm run dev
```

### Rebuild After Changes

```bash
docker compose up --build -d
```

### View Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

---

## License

This project is licensed under the ISC License.

---

<p align="center">
  Built by the Vangari team for IDSOL 2026 — Data Science: <a href="https://github.com/prachyabiswas">Prachya Biswas</a> · Repo setup: <a href="https://github.com/SamyoPramanik">Samyo Pramanik</a>
</p>
