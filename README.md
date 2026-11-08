# BidBazaar

A **MERN-stack online auction platform** where users can list products, participate in live auctions, track bids, and manage commission payments. Auction winners are notified automatically via email when an auction ends, while a Super Admin verifies commission payments.

## Tech Stack

- **Frontend:** React 18, Vite, Redux Toolkit, Tailwind CSS
- **Backend:** Node.js, Express 5, MongoDB, Mongoose
- **Additional Tools:** Cloudinary, Nodemailer, node-cron

## Features

- **User Accounts:** A single account can act as both bidder and auctioneer.
- **Auction Management:** Create, list, manage, and republish auction items.
- **Bidding System:** Place bids on active auctions with bidding and anti-sniping logic.
- **Watchlist:** Save auctions to track them easily.
- **Automated Auction Closing:** Background jobs handle ended auctions and winner notifications.
- **Commission Management:** Winners submit proof of the 5% commission payment.
- **Super Admin Dashboard:** View platform statistics, revenue and user graphs, verify payment proofs, and delete auctions.

## User Roles

| Role | Permissions |
|---|---|
| User | List items, bid on other users' items, manage watchlist, and submit commission payment proof. Users cannot bid on their own listings. |
| Super Admin | View dashboard statistics, revenue and user graphs, approve/reject payment proofs, and delete auctions. |

Payout details are required before a user's first listing.

Super Admin accounts cannot be created through the signup form. They must be created using the admin script.

## Run Locally

### Prerequisites

- Node.js 18.18 or later
- MongoDB database
- Cloudinary account
- SMTP credentials for email notifications

### 1. Clone the repository

```bash
git clone https://github.com/srishti831/BIDBAZAAR.git
cd BIDBAZAAR
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` directory and configure the required database, JWT, Cloudinary, SMTP, and frontend-origin variables using the names expected by the backend configuration.

Start the backend:

```bash
npm run dev
```

Backend runs at:

`http://localhost:5000`

### 3. Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend` directory:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

Start the frontend:

```bash
npm run dev
```

Frontend runs at:

`http://localhost:5173`

## Admin login & commission payments

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`; the Super Admin account is created automatically on the first start. Log in at `/login` and you land on the Dashboard.

In the Dashboard, fill **Where sellers pay you (commission)** with your UPI / bank / PayPal details. Sellers see exactly these on their Commission page and in the "auction sold" email. When a seller uploads a screenshot, review it under **Payment proofs** and press **Approve** (balance is cleared immediately and the seller is emailed) or **Reject** (with a reason).

## Emails

Emails go through the Gmail API (`GOOGLE_*` variables) and automatically fall back to SMTP (`SMTP_MAIL` / `SMTP_PASSWORD`, a Gmail app password). Failed emails are retried every minute for up to 3 days. If your Google OAuth app is in "Testing" mode, the refresh token expires after 7 days - publish the app (or rely on the SMTP fallback).

## Create a Super Admin manually

Run the following command from the backend directory:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='ChooseAStrongOne1' npm run create-admin
```

For Windows PowerShell:

```powershell
$env:ADMIN_EMAIL="you@example.com"
$env:ADMIN_PASSWORD="ChooseAStrongOne1"
npm run create-admin
```

Use your own email and a strong password.

## Database Migration

### Migrate User Roles

Older versions used separate `Bidder` and `Auctioneer` roles. The current version uses a single `User` role.

Run this once if you have an existing database:

```bash
npm run migrate-roles
```

### Migrate Auction Dates

Older versions stored auction start and end times as text. If you have auctions from an older version, run:

```bash
npm run migrate-dates
```

Alternatively, you can delete old test auctions.

## Deployment

### Services Required

- **MongoDB Atlas:** Create a cluster, database user, and configure Network Access.
- **Cloudinary:** Obtain your cloud name, API key, and API secret.
- **Gmail App Password:** Enable 2-Step Verification and generate an App Password for SMTP authentication.

### 1. Backend Deployment — Render

1. Create a new Web Service using this GitHub repository.
2. Set the Root Directory to `backend`.
3. Configure:
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check path: `/health`
4. Add the required environment variables from the backend configuration.
5. Set `NODE_ENV=production`.
6. Set `FRONTEND_URL` to your deployed frontend's exact origin.
7. Generate a new, strong `JWT_SECRET_KEY`.
8. Deploy the service.

Create the Super Admin once using Render Shell or locally connected to the same MongoDB database.

**Important:** Render's free tier may sleep after inactivity. Background cron jobs only execute while the backend service is running. For reliable auction closing and winner notifications, use an always-on service.

### 2. Frontend Deployment — Vercel or Netlify

1. Import the GitHub repository.
2. Set Root Directory to `frontend`.
3. Select Vite as the framework preset.
4. Configure the environment variable:

```env
VITE_API_URL=https://your-render-service.onrender.com/api/v1
```

5. Deploy the frontend.

The existing `vercel.json` and `public/_redirects` files handle client-side routing.

After deployment, update `FRONTEND_URL` in Render to match the final frontend URL exactly.

### Authentication in Production

The API uses an HttpOnly cookie with `SameSite=None; Secure` and the frontend also sends the JWT through a Bearer authorization header.

For a more robust production setup, use a custom domain with both applications under the same parent domain, for example:

- `app.example.com`
- `api.example.com`

## API Overview

Base URL: `/api/v1`

| Module | Endpoints / Functionality |
|---|---|
| User | Register, login, profile, payout details, password update, logout, leaderboard, watchlist |
| Auction Item | Create, list all, view auction, view own items, delete, republish |
| Bid | Place bid, view own bids |
| Commission | Submit payment proof, view own commission |
| Super Admin | Dashboard statistics, payment proofs, user graphs, monthly income, delete auctions |
| Health | `GET /health` |

## Tests

Run backend tests:

```bash
cd backend
npm test
```

The test suite runs 20 scenarios against bidding and republishing workflows using an in-memory MongoDB stand-in.

Scenarios cover:

- Bid increments
- Anti-sniping logic
- Race conditions
- Auction settlement rules

## Business rules (as implemented)

- A seller can run up to **2** upcoming/live auctions at once.
- Commission is 5% of the winning bid, added when the auction ends. Until it is paid and approved, the seller cannot list new items; after **7 days** unpaid, the seller also cannot bid.
- Items that received bids count as **sold** and cannot be deleted or republished (so commission cannot be erased). Items with no bids can be republished free.
- Two bids at the same moment: the database accepts only one write that still sees the old price; the other user gets "someone else bid first" and must bid again. Same amount twice is impossible - the later one is below the new minimum.
- If the server was asleep and missed the cron, the first visitor browsing auctions triggers settlement.
- `DEMO_MODE=true` (default) shows dummy UPI/bank details and a Demo notice. Set `DEMO_MODE=false` and enter real details in the admin Dashboard for real use.

## Known limitations (documented on purpose)

This is a demo/portfolio project. For production these would be next:

- JWT is also kept in `localStorage` (for Safari/cross-site cookies). Production: same parent domain + HttpOnly cookie only.
- No email verification or password reset; fake accounts can shill-bid.
- No strike system for winners who never pay; commission is an honour system (payments happen off-platform). Production: Razorpay/UPI with escrow.
- Commission is one running balance (no per-sale ledger); money is stored as floating numbers (use integer paise in production).
- Settlement is not wrapped in a DB transaction; a server crash in the middle of settling one auction could leave it half-processed.
- Rate limiter is in-memory (single instance only); auction list is capped at 300 items instead of full pagination; polling instead of websockets.
- No auto-bid, reserve price or ratings.

## License

This project is available on GitHub:

[BidBazaar — GitHub Repository](https://github.com/srishti831/BIDBAZAAR)
