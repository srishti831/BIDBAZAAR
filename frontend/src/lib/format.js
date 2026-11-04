export const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// "upcoming" | "live" | "ended"
export const getStatus = (auction, now) => {
  if (!auction) return "ended";
  if (new Date(auction.startTime).getTime() > now) return "upcoming";
  if (new Date(auction.endTime).getTime() > now) return "live";
  return "ended";
};

export const formatCountdown = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d > 0 ? `${d}d ` : ""}${pad(h)}:${pad(m)}:${pad(s)}`;
};

export const timeAgo = (value, now) => {
  const seconds = Math.max(0, Math.floor((now - new Date(value).getTime()) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// Mirrors backend/utils/bidding.js
export const getMinIncrement = (currentBid) => {
  const value = Number(currentBid) || 0;
  if (value < 100) return 5;
  if (value < 1000) return 25;
  if (value < 10000) return 100;
  if (value < 100000) return 500;
  return 1000;
};

export const getMinNextBid = (auction) => {
  const current = Number(auction?.currentBid) || 0;
  if (current <= 0) return Number(auction?.startingBid) || 0;
  return current + getMinIncrement(current);
};

export const AUCTION_CATEGORIES = [
  "Electronics",
  "Furniture",
  "Art & Antiques",
  "Jewelry & Watches",
  "Automobiles",
  "Real Estate",
  "Collectibles",
  "Fashion & Accessories",
  "Sports Memorabilia",
  "Books & Manuscripts",
];

export const INDIAN_BANKS = [
  "State Bank of India", "Punjab National Bank", "Bank of Baroda", "Canara Bank",
  "Union Bank of India", "Indian Bank", "Bank of India", "Central Bank of India",
  "Indian Overseas Bank", "UCO Bank", "Bank of Maharashtra", "Axis Bank", "HDFC Bank",
  "ICICI Bank", "Kotak Mahindra Bank", "IndusInd Bank", "Yes Bank", "IDFC First Bank",
  "Federal Bank", "RBL Bank", "Bandhan Bank", "CSB Bank", "South Indian Bank",
  "DBS Bank India", "AU Small Finance Bank", "Equitas Small Finance Bank",
  "Jana Small Finance Bank", "ESAF Small Finance Bank", "Utkarsh Small Finance Bank",
  "Fincare Small Finance Bank", "Suryoday Small Finance Bank", "Nainital Bank",
  "Standard Chartered Bank", "Citibank India", "HSBC Bank", "Deutsche Bank",
];

export const hasPayoutDetails = (user) => !!user?.payoutReady;
