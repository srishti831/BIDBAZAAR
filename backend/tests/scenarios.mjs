import { mock } from "node:test";
import assert from "node:assert/strict";
const B = new URL("../", import.meta.url).href;

// ---------- tiny in-memory Mongo stand-in (only what the controllers use) ----------
const store = { auctions: [], users: {}, userUpdates: [], emails: [], bidUpserts: 0, bidDeletes: 0 };
const cmp = (v, cond) => {
  if (cond && typeof cond === "object" && !(cond instanceof Date) && !Array.isArray(cond)) {
    return Object.entries(cond).every(([op, x]) => ({
      $lte: () => v <= x, $gt: () => v > x, $lt: () => v < x, $in: () => x.includes(v), $ne: () => v !== x,
    }[op]()));
  }
  return String(v) === String(cond);
};
const match = (d, filter) => Object.entries(filter).every(([k, cond]) => {
  if (k === "bids.userId") {
    const has = d.bids.some((b) => String(b.userId) === String(cond.$ne ?? cond));
    return cond && cond.$ne !== undefined ? !has : has;
  }
  const v = d[k];
  if (v === undefined || v === null) return cond?.$in ? cond.$in.includes(v ?? null) : false;
  return cmp(v, cond);
});
const clone = (d) => structuredClone(d);
const wrap = (d) => d && Object.assign(d, { toObject() { return clone(d); } });
const Auction = {
  findById: async (id) => wrap(store.auctions.find((a) => a._id === id) || null),
  countDocuments: async () => 0,
  findOneAndUpdate: async (filter, upd) => {
    const d = store.auctions.find((a) => match(a, filter));
    if (!d) return null;
    const posIdx = filter["bids.userId"] ? d.bids.findIndex((b) => String(b.userId) === String(filter["bids.userId"])) : -1;
    for (const [k, v] of Object.entries(upd.$set || {})) {
      if (k.startsWith("bids.$.")) d.bids[posIdx][k.slice(7)] = v; else d[k] = v;
    }
    if (upd.$push) d.bids.push(upd.$push.bids);
    for (const [k, v] of Object.entries(upd.$inc || {})) d[k] = (d[k] || 0) + v;
    return wrap(d);
  },
  findByIdAndUpdate: async (id, upd) => { const d = store.auctions.find((a) => a._id === id); Object.assign(d, upd.$set); return wrap(d); },
};
const Bid = { findOneAndUpdate: async () => { store.bidUpserts++; }, deleteMany: async () => { store.bidDeletes++; } };
const User = {
  findById: (id) => { const u = store.users[id]; const p = Promise.resolve(u); p.select = async () => u; return p; },
  findByIdAndUpdate: async (id, upd) => { store.userUpdates.push({ id, upd }); return store.users[id]; },
  updateMany: async () => {}, find: () => ({ select: () => ({ lean: async () => [] }) }),
};
mock.module(B + "models/auctionSchema.js", { namedExports: { Auction } });
mock.module(B + "models/bidSchema.js", { namedExports: { Bid } });
mock.module(B + "models/userSchema.js", { namedExports: { User, LEGACY_ROLES: [] } });
mock.module(B + "utils/sendEmail.js", { namedExports: { sendEmail: async (m) => { store.emails.push(m); } } });
mock.module("cloudinary", { namedExports: { v2: { uploader: { destroy: async () => {} } } } });

const { placeBid } = await import(B + "controllers/bidController.js");
const { republishItem } = await import(B + "controllers/auctionItemController.js");

const call = (handler, { user, params = {}, body = {} }) => new Promise((resolve) => {
  let status = 200;
  const res = { status(c) { status = c; return this; }, json(j) { resolve({ status, json: j, message: j?.message }); return this; } };
  handler({ user, params, body }, res, (e) => resolve({ status: e.statusCode, message: e.message, error: e }));
});
const H = 3600e3, now = () => Date.now();
const mk = (o = {}) => ({ _id: "aaaaaaaaaaaaaaaaaaaaaaaa", title: "Watch", startingBid: 500, currentBid: 0, createdBy: "seller", highestBidder: null,
  startTime: new Date(now() - H), endTime: new Date(now() + H), bids: [], commissionCalculated: false, extensions: 0, ...o });
const u = (id, extra = {}) => { const x = { _id: id, userName: id, email: id + "@x.com", profileImage: { url: "u" }, role: "User", ...extra }; store.users[id] = x; return x; };
const alice = u("alice"), bob = u("bob"), seller = u("seller", { paymentMethods: { upi: { upiId: "a@b" } } });
const reset = (a) => { store.auctions = [a]; store.emails = []; store.userUpdates = []; };
let n = 0; const ok = (name) => console.log("PASS", ++n, name);

// ----- bidding -----
reset(mk());
let r = await call(placeBid, { user: seller, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { amount: 600 } });
assert.equal(r.status, 403); ok("seller cannot bid on own auction");
r = await call(placeBid, { user: alice, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { amount: 400 } });
assert.equal(r.status, 400); assert.match(r.message, /at least/); ok("below starting bid rejected");
r = await call(placeBid, { user: alice, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { amount: "abc" } });
assert.equal(r.status, 400); ok("non-numeric rejected");
r = await call(placeBid, { user: alice, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { amount: 500 } });
assert.equal(r.status, 201); assert.equal(store.auctions[0].currentBid, 500); assert.equal(store.auctions[0].highestBidder, "alice"); ok("first bid at starting price accepted");
r = await call(placeBid, { user: alice, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { amount: 700 } });
assert.equal(r.status, 400); assert.match(r.message, /highest bid/); ok("cannot outbid yourself");
r = await call(placeBid, { user: bob, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { amount: 510 } });
assert.equal(r.status, 400); assert.match(r.message, /525/); ok("minimum increment enforced (500 -> 525)");
r = await call(placeBid, { user: bob, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { amount: 525 } });
assert.equal(r.status, 201); assert.equal(store.auctions[0].highestBidder, "bob"); assert.equal(store.auctions[0].bids.length, 2); ok("valid raise accepted");
await new Promise((x) => setTimeout(x, 20));
assert.equal(store.emails.length, 1); assert.equal(store.emails[0].email, "alice@x.com"); ok("previous leader emailed 'outbid'");
r = await call(placeBid, { user: alice, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { amount: 600 } });
assert.equal(r.status, 201); assert.equal(store.auctions[0].bids.length, 2, "same user updates entry, no duplicate"); ok("returning bidder updates own entry (no duplicate)");
const end0 = +store.auctions[0].endTime;
assert.equal(store.auctions[0].extensions, 0); assert.equal(+store.auctions[0].endTime, end0); ok("no extension when far from the end");

// anti-sniping
reset(mk({ endTime: new Date(now() + 30e3) }));
r = await call(placeBid, { user: alice, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { amount: 500 } });
assert.equal(r.status, 201); assert.equal(r.json.extended, true);
assert.ok(store.auctions[0].endTime - now() > 100e3 && store.auctions[0].extensions === 1); ok("last-minute bid extends auction by ~2 min");

// state guards
reset(mk({ startTime: new Date(now() + H), endTime: new Date(now() + 2 * H) }));
r = await call(placeBid, { user: alice, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { amount: 500 } });
assert.equal(r.status, 400); assert.match(r.message, /hasn't started/); ok("cannot bid before start");
reset(mk({ startTime: new Date(now() - 2 * H), endTime: new Date(now() - H) }));
r = await call(placeBid, { user: alice, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { amount: 500 } });
assert.equal(r.status, 400); assert.match(r.message, /ended/); ok("cannot bid after end");

// race: price changes between read and write -> 409, nothing written
reset(mk({ currentBid: 500, highestBidder: "bob", bids: [{ userId: "bob", amount: 500 }] }));
const orig = Auction.findById;
Auction.findById = async (id) => { const d = await orig(id); setTimeout(() => {}, 0); const snap = { ...d, bids: clone(d.bids) }; store.auctions[0].currentBid = 900; store.auctions[0].highestBidder = "carol"; return wrap(snap); };
r = await call(placeBid, { user: alice, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { amount: 525 } });
Auction.findById = orig;
assert.equal(r.status, 409); assert.equal(store.auctions[0].currentBid, 900); ok("concurrent bid detected -> 409, higher price preserved");

// ----- republish -----
const ended = (o = {}) => mk({ startTime: new Date(now() - 3 * H), endTime: new Date(now() - H), ...o });
const body = { startNow: true, endTime: new Date(now() + 24 * H).toISOString() };
reset(mk());
r = await call(republishItem, { user: seller, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body });
assert.equal(r.status, 400); assert.match(r.message, /hasn't ended/); ok("republish refused while auction still running (clear message)");
reset(ended());
r = await call(republishItem, { user: alice, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body });
assert.equal(r.status, 403); ok("only the owner can republish");
reset(ended({ currentBid: 1000, highestBidder: "alice", bids: [{ userId: "alice", amount: 1000 }], commissionCalculated: false }));
r = await call(republishItem, { user: seller, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body });
assert.equal(r.status, 400); assert.match(r.message, /sold/); ok("item with bids (sold) cannot be republished");
reset(ended({ currentBid: 1000, highestBidder: "alice", bids: [{ userId: "alice", amount: 1000 }], commissionCalculated: true }));
r = await call(republishItem, { user: seller, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body });
assert.equal(r.status, 400); assert.equal(store.userUpdates.length, 0, "no commission/stat rollback any more");
ok("settled (sold) item cannot be republished - commission cannot be erased");
reset(ended());
r = await call(republishItem, { user: seller, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body });
assert.equal(r.status, 200); assert.equal(store.userUpdates.length, 0); ok("unsold item republishes fresh without touching any stats");
reset(ended());
r = await call(republishItem, { user: seller, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { startNow: false, startTime: new Date(now() - H).toISOString(), endTime: new Date(now() + H).toISOString() } });
assert.equal(r.status, 400); assert.match(r.message, /past/); ok("past start time gives a helpful error");
// republish must obey the unpaid-commission rule too
reset(ended());
store.users.seller.unpaidCommission = 500;
r = await call(republishItem, { user: store.users.seller, params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body });
assert.equal(r.status, 403); assert.match(r.message, /unpaid commissions/); ok("seller with unpaid commission cannot republish");
store.users.seller.unpaidCommission = 0;
console.log(`\nAll ${n} backend scenario checks passed`);
