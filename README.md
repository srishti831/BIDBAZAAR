# BidBazaar – Online Auction Platform

BidBazaar is a MERN stack-based online auction platform where users can buy and sell products through auctions.

A user can create an auction for a product and other users can place bids on it. When the auction ends, the highest bidder wins the auction. The platform also handles commission calculation, payment proof submission, and admin verification.

The main idea behind this project is to provide a platform where users can participate in auctions and manage their buying and selling activities from a single account.

## Features

### User Account
- Users can register and log in.
- A single account can be used for both buying and selling.
- Users can manage their profile and payout details.
- Users can view their bidding and auction activities.

### Auction Management
- Users can create and schedule auctions.
- Browse upcoming, active, and completed auctions.
- View auction details and current highest bids.
- Manage their own auction listings.
- Republish auctions that ended without any bids.
- Upload product images using Cloudinary.

### Bidding System
- Users can place bids on active auctions.
- The system checks whether a bid meets the minimum bid requirement.
- Users cannot bid on their own products.
- Users can track their bidding history.
- The previous highest bidder is notified when someone places a higher bid.

### Anti-Sniping
To prevent users from placing a last-second bid just before an auction ends:
- If someone places a bid in the last minute, the auction is extended by 2 minutes.
- This extension can happen a maximum of 3 times.
- The minimum auction duration is 5 minutes.

### Automatic Auction Settlement
- Auctions are automatically processed when their end time is reached.
- The highest bidder is selected as the winner.
- Winner and seller information is updated.
- The platform calculates the seller's commission.
- Emails are sent to the winner and seller.
- Failed email notifications are retried automatically.

### Commission Management
- The platform charges a 5% commission on successful auctions.
- Sellers can view their unpaid commission.
- Sellers submit a screenshot as proof of commission payment.
- The Super Admin reviews the payment proof and approves or rejects it.
- The seller's outstanding commission is updated after approval.

### Super Admin Dashboard
- View platform statistics.
- View monthly user and revenue graphs.
- Monitor auctions and users.
- Review commission payment proofs.
- Approve or reject payment submissions.
- Manage platform payment details.
- Delete eligible auction listings.

### Email Notifications
- Gmail API is used for sending emails, with SMTP as a fallback.
- Winners receive auction-winning emails.
- Sellers receive auction completion and commission details.
- Previous highest bidders receive outbid notifications.
- Failed notifications are retried automatically.

### Demo Payment Mode
The project includes a demo payment mode that displays sample UPI and bank details. It allows users to demonstrate the commission payment workflow without making actual payments.

## Tech Stack

- **Frontend:** React, Vite, JavaScript, Tailwind CSS
- **State Management:** Redux Toolkit
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Authentication:** JWT, bcrypt
- **Image Uploads:** Cloudinary
- **Email:** Gmail API, OAuth 2.0, Nodemailer
- **Scheduled Tasks:** node-cron
- **Deployment:** Vercel and Render

## Project Structure

```text
BidBazaar/
│
├── backend/
│   ├── automation/
│   ├── controllers/
│   ├── database/
│   ├── middlewares/
│   ├── models/
│   ├── router/
│   ├── scripts/
│   ├── tests/
│   ├── utils/
│   ├── app.js
│   └── server.js
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── custom-components/
│       ├── hooks/
│       ├── layout/
│       ├── lib/
│       ├── pages/
│       └── store/
│
└── README.md
```

## Run Locally

### Requirements
- Node.js 18.18 or later
- MongoDB database
- Cloudinary account

### 1. Clone the repository

```bash
git clone https://github.com/srishti831/BIDBAZAAR.git
cd BIDBAZAAR
```

### 2. Start the backend

```bash
cd backend
npm install
npm run dev
```

Configure the required environment variables in `backend/.env`, including MongoDB, JWT, Cloudinary, email, and frontend URL settings.

Backend runs at `http://localhost:5000`.

### 3. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

Run:

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Admin Setup

The Super Admin account can be created using the admin setup script.

Configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the backend environment variables, then run:

```bash
cd backend
npm run create-admin
```

The admin can log in through the application and access the dashboard.

## Deployment

- **Frontend:** Deployed on Vercel.
- **Backend:** Deployed on Render.
- **Database:** MongoDB Atlas.

Live links:

- **Frontend:** [BidBazaar](https://bidbazaar-drab.vercel.app/)
- **Backend:** https://bidbazaar-api-u49p.onrender.com
- **GitHub:** https://github.com/srishti831/BIDBAZAAR

## Testing

Backend tests can be run using:

```bash
cd backend
npm test
```

The tests cover bidding rules, anti-sniping logic, auction settlement scenarios, and related functionality.

## Author

**Srishti Singh**

B.Tech – Computer Science and Engineering  
Motilal Nehru National Institute of Technology Allahabad

[GitHub](https://github.com/srishti831)