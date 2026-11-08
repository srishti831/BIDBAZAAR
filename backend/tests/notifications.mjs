import { mock } from "node:test";
import assert from "node:assert/strict";
const B = new URL("../", import.meta.url).href;

const H = 3600e3;
const store = { auctions: [], users: {}, emails: [], failFor: new Set(), userInc: [] };

const getPath = (o, path) => path.split(".").reduce((v, k) => (v == null ? v : v[k]), o);
const setPath = (o, path, val) => {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((v, k) => (v[k] ??= {}), o);
  target[last] = val;
};
const matches = (d, f) =>
  Object.entries(f).every(([k, c]) => {
    const v = getPath(d, k);
    if (c && typeof c === "object" && !(c instanceof Date)) {
      return Object.entries(c).every(([op, x]) => ({ $lt: () => v < x, $gt: () => v > x }[op]()));
    }
    return String(v) === String(c);
  });

const Auction = {
  find: async (f) => store.auctions.filter((a) => matches(a, f)),
  findOneAndUpdate: async (f, upd) => {
    const d = store.auctions.find((a) => matches(a, f));
    if (!d) return null;
    for (const [k, v] of Object.entries(upd.$set || {})) setPath(d, k, v);
    return d;
  },
  updateOne: async (f, upd) => {
    const d = store.auctions.find((a) => matches(a, f));
    for (const [k, v] of Object.entries(upd.$set || {})) setPath(d, k, v);
  },
};
const Bid = { findOne: () => ({ sort: async () => null }) };
const User = {
  findById: async (id) => store.users[id] || null,
  findByIdAndUpdate: async (id, upd) => {
    store.userInc.push({ id, inc: upd.$inc });
    for (const [k, v] of Object.entries(upd.$inc || {})) store.users[id][k] = (store.users[id][k] || 0) + v;
    return store.users[id];
  },
  find: () => ({ select: () => ({ lean: async () => [] }) }),
};
const Settings = { findOne: () => ({ lean: async () => ({ commissionPayment: { upiId: "admin@upi", upiName: "Admin" } }) }) };

mock.module(B + "models/auctionSchema.js", { namedExports: { Auction } });
mock.module(B + "models/bidSchema.js", { namedExports: { Bid } });
mock.module(B + "models/userSchema.js", { namedExports: { User, LEGACY_ROLES: [] } });
mock.module(B + "models/settingsSchema.js", { namedExports: { Settings } });
mock.module(B + "utils/sendEmail.js", {
  namedExports: {
    sendEmail: async (m) => {
      if (store.failFor.has(m.email)) throw new Error("smtp down");
      store.emails.push(m);
    },
  },
});
mock.module("node-cron", { defaultExport: { schedule() {} } });
mock.module("cloudinary", { namedExports: { v2: { uploader: {} } } });

const { settleEndedAuctions, sendPendingNotifications } = await import(B + "automation/endedAuctionCron.js");

let n = 0;
const ok = (name) => console.log("PASS", ++n, name);

store.users.seller = { _id: "seller", userName: "Sam", email: "seller@x.com", unpaidCommission: 0, paymentMethods: { upi: { upiId: "s@upi" } } };
store.users.alice = { _id: "alice", userName: "Alice", email: "alice@x.com", moneySpent: 0, auctionsWon: 0 };
store.users.bob = { _id: "bob", userName: "Bob", email: "bob@x.com", moneySpent: 0, auctionsWon: 0 };

const ended = (id, title, bids) => ({
  _id: id, title, createdBy: "seller", startTime: new Date(Date.now() - 3 * H), endTime: new Date(Date.now() - 60e3),
  commissionCalculated: false, currentBid: 0, highestBidder: null, bids,
  notify: { pending: false, winnerSent: false, sellerSent: false, attempts: 0, lastError: "" },
});
store.auctions = [
  ended("a1", "First watch", [{ userId: "alice", amount: 1000 }, { userId: "bob", amount: 800 }]),
  ended("a2", "Second ₹ lamp", [{ userId: "bob", amount: 2000 }]),
  ended("a3", "Nobody wanted it", []),
];

await settleEndedAuctions();
assert.equal(store.auctions[0].highestBidder, "alice");
assert.equal(store.auctions[0].currentBid, 1000);
assert.equal(store.auctions[1].highestBidder, "bob");
assert.equal(store.users.seller.unpaidCommission, 150, "5% of 1000 + 5% of 2000");
assert.equal(store.users.alice.auctionsWon, 1);
ok("every ended auction is settled with the right winner, stats and 5% commission");

await settleEndedAuctions();
assert.equal(store.users.seller.unpaidCommission, 150);
ok("settling again never double-charges commission");

// Winner of the FIRST auction cannot be emailed (mail server hiccup) - the second one can.
store.failFor.add("alice@x.com");
await sendPendingNotifications();
const to = store.emails.map((e) => e.email);
assert.ok(to.includes("bob@x.com"), "second winner emailed");
assert.ok(to.filter((e) => e === "seller@x.com").length === 3, "seller gets one email per auction, incl. 'no bids'");
assert.equal(store.auctions[0].notify.winnerSent, false);
assert.equal(store.auctions[0].notify.pending, true, "failed winner email stays queued");
assert.equal(store.auctions[1].notify.pending, false);
ok("a failing email no longer blocks the others and stays queued");

const sellerMail = store.emails.find((e) => e.email === "seller@x.com" && e.subject.includes("First watch"));
assert.match(sellerMail.message, /admin@upi/, "seller email tells where to pay the commission");
assert.ok(store.emails.some((e) => /no bids/i.test(e.subject)));
ok("seller email includes admin payment details; 'no bids' seller email sent");

store.failFor.clear();
const before = store.emails.length;
await sendPendingNotifications();
assert.equal(store.emails.length, before + 1);
assert.equal(store.emails.at(-1).email, "alice@x.com");
assert.equal(store.auctions[0].notify.pending, false);
ok("retry delivers the missed winner email exactly once");

await sendPendingNotifications();
assert.equal(store.emails.length, before + 1);
ok("no duplicate emails after everything was delivered");

console.log(`\nAll ${n} notification checks passed`);
