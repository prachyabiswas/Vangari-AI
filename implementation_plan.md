# Vangari AI Foundation Architecture

Scaffold the foundational architecture and write the core functional code for "Vangari AI", an automated, hyper-local circular economy and waste market arbitrage platform. This involves setting up the primary database schema, an Express.js backend with AI and geo-spatial logic, and a Next.js owner dashboard interface.

## User Review Required

> [!WARNING] 
> Prisma does not have native, fully typed support for PostGIS functions out of the box. I will use Prisma's `Unsupported("geometry(Point, 4326)")` for the location field in the `User` model, and raw SQL queries (`$queryRaw`) to compute geographic distances for the dispatch algorithm. Please verify if this approach is suitable or if you prefer using a different ORM or raw SQL entirely for the geospacial queries.

> [!IMPORTANT]
> The AI processing step will simulate calling the OpenAI API using `openai` SDK. You'll need to provide an `OPENAI_API_KEY` in your `.env` for real calls. Is `shadcn/ui` expected to be fully installed with its components, or should I scaffold the UI structural components using standard Tailwind classes?

## Proposed Changes

### Backend (Express.js Setup)

We will initialize a basic Express.js application interacting with PostgreSQL via `pg` (node-postgres) using raw SQL queries.

#### [NEW] `backend/package.json`
Dependencies for Express, pg, cors, openai, and dotenv.

#### [NEW] `backend/db/schema.sql`
Raw SQL script to define the 3 core tables:
- `users`: Roles, wallet balance, and PostGIS `location_geom`.
- `market_rates`: Current commodity prices.
- `waste_listings`: Details about the uploaded waste and estimated payouts.

#### [NEW] `backend/src/db.js`
PostgreSQL connection pool setup.

#### [NEW] `backend/src/index.js`
Main Express application, exposing the `/api` routes and connecting to Prisma.

#### [NEW] `backend/src/routes/waste.js`
The route definitions for `POST /api/waste/analyze` and `POST /api/waste/dispatch/:listingId`.

#### [NEW] `backend/src/controllers/wasteController.js`
The implementation logic:
- `analyze`: Instructing GPT-4o Vision to estimate waste weight, computing payout from market rates, and creating a pending listing.
- `dispatch`: Querying the nearest `COLLECTOR` using PostGIS ST_Distance, and updating the listing.

---

### Frontend (Next.js Application)

We will initialize a Next.js App Router application with Tailwind CSS.

#### [NEW] `frontend/package.json`
Standard Next.js boilerplate with Tailwind.

#### [NEW] `frontend/src/app/page.tsx`
The primary Owner Dashboard (React Server Component structure). Contains state for the uploaded image, AI estimations, and the Request Pickup flow.

#### [NEW] `frontend/src/components/UploadForm.tsx`
Client component for uploading the image (or fetching a predefined URL) and displaying the "Analysis Result" card once processed.

#### [NEW] `frontend/src/components/AnalysisResult.tsx`
Stateful display card visually rendering the AI's breakdown of materials, estimated weights, and the calculated BDT payout, along with a "Request Pickup" button to trigger the dispatch logic.

---

## Resolved Questions

1. **Separation**: We will create distinct `/frontend` and `/backend` directories in the workspace.
2. **UI Styling**: `shadcn/ui` will be initialized using a professional 'slate' base color.
3. **NGINX**: An `nginx.conf` file will be included at the root to proxy requests correctly.

## Verification Plan

### Automated Tests
- Ensure Prisma schema can be successfully formatted.
- Ensure all basic Javascript/Typescript files compile or run cleanly.

### Manual Verification
1. Running `npm run dev` in both directories.
2. Sending a mocked POST request to the API with an image URL to see if it properly returns the AI estimates.
3. Reviewing the mocked Next.js interface for aesthetics and layout flow.
