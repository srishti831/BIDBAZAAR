
// Shared auction rules. Keep these in one place so the API, cron jobs and
// the frontend (which mirrors getMinIncrement) agree.

// A bid placed in the last SNIPE_WINDOW_MS extends the auction by
// SNIPE_EXTENSION_MS so nobody can win with a last-second sniper bid.
export const SNIPE_WINDOW_MS = 1 * 60 * 1000;
export const SNIPE_EXTENSION_MS = 2 * 60 * 1000;
export const MAX_SNIPE_EXTENSIONS = 3;

// How many upcoming/live auctions one seller may have at the same time.
// Kept low so a seller cannot pile up commission across many parallel sales
// before the first one has been settled.
export const MAX_ACTIVE_LISTINGS = 2;

// Commission must be paid within this many days of the sale; after that the
// seller is also blocked from bidding until it is cleared.
export const COMMISSION_DUE_DAYS = 7;
export const COMMISSION_DUE_MS = COMMISSION_DUE_DAYS * 24 * 60 * 60 * 1000;

export const isCommissionOverdue = (user, now = Date.now()) =>
  Number(user?.unpaidCommission) > 0 &&
  !!user?.commissionDueAt &&
  new Date(user.commissionDueAt).getTime() < now;

// Minimum amount a new bid must beat the current bid by.
export const getMinIncrement = (currentBid) => {
  const value = Number(currentBid) || 0;
  if (value < 100) return 5;
  if (value < 1000) return 25;
  if (value < 10000) return 100;
  if (value < 100000) return 500;
  return 1000;
};

// The lowest amount that will currently be accepted.
export const getMinNextBid = (auction) => {
  const current = Number(auction.currentBid) || 0;
  if (current <= 0) return Number(auction.startingBid) || 0;
  return current + getMinIncrement(current);
};

export const getAuctionStatus = (auction, now = new Date()) => {
  if (new Date(auction.startTime) > now) return "upcoming";
  if (new Date(auction.endTime) > now) return "live";
  return "ended";
};

export const hasPayoutDetails = (user) => {
  const bank = user?.paymentMethods?.bankTransfer || {};
  const bankOk = !!(
    bank.bankName &&
    bank.bankAccountName &&
    bank.bankAccountNumber
  );
  const paypalOk = !!user?.paymentMethods?.paypal?.paypalEmail;
  const upiOk = !!user?.paymentMethods?.upi?.upiId;
  return bankOk || paypalOk || upiOk;
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

export const MIN_AUCTION_DURATION_MS = 5 * 60 * 1000;
export const MAX_AUCTION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// Clock skew / date-picker slots: a start time this close to "now" is accepted
// and simply treated as "start immediately".
export const START_GRACE_MS = 5 * 60 * 1000;

// Resolves + validates the schedule sent by the create/republish forms.
// Returns { start, end } or { error }.
export const resolveSchedule = ({ startTime, endTime, startNow }) => {
  const now = new Date();
  const wantsNow = startNow === true || startNow === "true";
  let start = wantsNow ? now : new Date(startTime);
  const end = new Date(endTime);

  if (!wantsNow && !startTime) {
    return { error: "Please choose a start time." };
  }

  if (!endTime) {
    return { error: "Please choose an end time." };
  }

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Invalid start or end time." };
  }

  if (start < now) {
    if (now - start > START_GRACE_MS) {
      return {
        error: "Start time is in the past. Pick a later time or choose “Start now”.",
      };
    }
    start = now;
  }

  if (end <= start) {
    return { error: "Auction end time must be after its start time." };
  }

  if (end - start < MIN_AUCTION_DURATION_MS) {
    return { error: "An auction must run for at least 5 minutes." };
  }

  if (end - start > MAX_AUCTION_DURATION_MS) {
    return { error: "An auction can run for 30 days at most." };
  }

  return { start, end };
};
