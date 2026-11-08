import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  BadgeCheck,
  Crown,
  Gavel,
  Hourglass,
  Link2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Timer,
  Trophy,
} from "lucide-react";
import { getAuctionDetail } from "@/store/slices/auctionSlice";
import { placeBid } from "@/store/slices/bidSlice";
import { useNow } from "@/hooks/useNow";
import { formatDateTime, formatMoney, getStatus, timeAgo } from "@/lib/format";
import { Page, EmptyState } from "@/custom-components/Page";
import Countdown from "@/custom-components/Countdown";
import StatusBadge from "@/custom-components/StatusBadge";
import WatchButton from "@/custom-components/WatchButton";
import Modal from "@/custom-components/Modal";

const AuctionItem = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const now = useNow();

  const { detail, detailLoading } = useSelector((s) => s.auction);
  const { placing } = useSelector((s) => s.bid);
  const { isAuthenticated, authChecked, user } = useSelector((s) => s.user);

  const loaded = detail.auction && String(detail.auction._id) === id ? detail : null;
  const { auction, bidders = [], seller, winner, isOwner, minNextBid, minIncrement } = loaded || {};

  const [amount, setAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const prev = useRef({ bid: null, leader: null });
  const firstStatus = useRef(true);

  const status = auction ? getStatus(auction, now) : null;
  const myId = user?._id ? String(user._id) : null;
  const leaderId = auction?.highestBidder ? String(auction.highestBidder) : null;
  const isLeader = !!myId && leaderId === myId;
  const isMember = isAuthenticated && user?.role === "User";
  const isAdmin = isAuthenticated && user?.role === "Super Admin";
  const hasBids = (auction?.currentBid || 0) > 0;

  // --- data loading -------------------------------------------------------
  useEffect(() => {
    setAmount("");
    dispatch(getAuctionDetail(id));
  }, [id, dispatch]);

  // Once we know who the viewer is, refresh quietly so isOwner/"you" are right.
  useEffect(() => {
    if (authChecked) dispatch(getAuctionDetail(id, { silent: true }));
  }, [authChecked, user?._id, id, dispatch]);

  // Live polling: every 4s while bidding is open, slower before it starts.
  useEffect(() => {
    if (!auction || status === "ended") return undefined;
    const timer = setInterval(
      () => {
        if (!document.hidden) dispatch(getAuctionDetail(id, { silent: true }));
      },
      status === "live" ? 4000 : 10000
    );
    return () => clearInterval(timer);
  }, [id, status, !!auction, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // The moment it opens / closes, re-sync with the server.
  useEffect(() => {
    if (firstStatus.current) {
      firstStatus.current = false;
      return;
    }
    if (auction) dispatch(getAuctionDetail(id, { silent: true }));
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the bid box at (or above) the current minimum.
  useEffect(() => {
    if (!minNextBid) return;
    setAmount((current) =>
      current === "" || Number(current) < minNextBid ? String(minNextBid) : current
    );
  }, [minNextBid, auction?._id]);

  // New bid landed: flash the price and tell people who got outbid.
  useEffect(() => {
    if (!auction) {
      prev.current = { bid: null, leader: null };
      return;
    }
    const before = prev.current;
    if (before.bid !== null && auction.currentBid > before.bid) {
      setFlashKey((k) => k + 1);
      if (myId && before.leader === myId && leaderId !== myId) {
        toast.warn(`You've been outbid! New high bid: ${formatMoney(auction.currentBid)}`, {
          toastId: `outbid-${auction._id}-${auction.currentBid}`,
        });
      } else if (leaderId !== myId) {
        toast.info(`New bid: ${formatMoney(auction.currentBid)}`, {
          toastId: `bid-${auction._id}-${auction.currentBid}`,
          autoClose: 2500,
        });
      }
    }
    prev.current = { bid: auction.currentBid, leader: leaderId };
  }, [auction?.currentBid, leaderId, auction?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- bidding ------------------------------------------------------------
  const numeric = Number(amount);
  const amountTooLow = !Number.isFinite(numeric) || numeric < (minNextBid || 0);
  const looksLikeTypo = hasBids
    ? numeric > auction.currentBid * 5
    : numeric > (auction?.startingBid || 0) * 5;
  const canBid = status === "live" && isMember && !isOwner && !isLeader;

  const chips = minNextBid
    ? [...new Set([0, 1, 2, 5, 10].map((n) => minNextBid + n * (minIncrement || 0)))]
    : [];

  const askToConfirm = (e) => {
    e.preventDefault();
    if (amountTooLow) {
      toast.error(`Your bid must be at least ${formatMoney(minNextBid)}.`);
      return;
    }
    setConfirmOpen(true);
  };

  const confirmBid = async () => {
    await dispatch(placeBid(id, numeric));
    setConfirmOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied.");
    } catch {
      toast.info(window.location.href);
    }
  };

  // --- states without an auction -----------------------------------------
  if (!loaded) {
    if (detailLoading || !detail.error) {
      return (
        <Page>
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <div className="skeleton aspect-[4/3] w-full" />
            <div className="skeleton h-[480px] w-full" />
          </div>
        </Page>
      );
    }
    return (
      <Page narrow>
        <EmptyState
          icon={Gavel}
          title="We couldn't find that auction"
          text={detail.error}
          actionLabel="Browse auctions"
          actionTo="/auctions"
        />
      </Page>
    );
  }

  const progress =
    status === "live"
      ? Math.min(
          100,
          Math.max(
            0,
            ((now - new Date(auction.startTime)) /
              (new Date(auction.endTime) - new Date(auction.startTime))) *
              100
          )
        )
      : status === "ended"
      ? 100
      : 0;

  const sold = status === "ended" && hasBids;
  const closingSoon = status === "live" && new Date(auction.endTime) - now < 5 * 60 * 1000;

  return (
    <Page className="pb-28 lg:pb-10">
      <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-dim" aria-label="Breadcrumb">
        <Link to="/auctions" className="hover:text-fg">Auctions</Link>
        <span>/</span>
        <Link to={`/auctions?category=${encodeURIComponent(auction.category)}`} className="hover:text-fg">
          {auction.category}
        </Link>
        <span>/</span>
        <span className="truncate text-fg">{auction.title}</span>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_420px]">
        {/* ------------ left: item ------------ */}
        <div className="space-y-6">
          <div className="panel relative aspect-[4/3] overflow-hidden bg-ink-950">
            <img src={auction.image?.url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-30 blur-3xl" />
            <img src={auction.image?.url} alt={auction.title} className="relative h-full w-full object-contain p-4" />
          </div>

          <div className="panel panel-pad">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} sold={sold} />
              <span className="badge bg-ink-600 text-dim">{auction.condition}</span>
              {isOwner && <span className="badge bg-bid/25 text-bid-soft">Your listing</span>}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">{auction.title}</h1>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              {seller && (
                <div className="flex items-center gap-3">
                  <img src={seller.profileImage?.url || "/imageHolder.jpg"} alt="" className="h-10 w-10 rounded-xl object-cover" />
                  <div>
                    <p className="text-xs text-dim">Listed by</p>
                    <p className="text-sm font-bold">{seller.userName}</p>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                {!isOwner && !isAdmin && <WatchButton auctionId={auction._id} variant="button" />}
                <button type="button" onClick={copyLink} className="btn-ghost btn-sm">
                  <Link2 size={15} /> Share
                </button>
              </div>
            </div>

            <h2 className="mb-2 mt-7 text-lg font-bold">About this item</h2>
            <div className="space-y-3 leading-relaxed text-dim">
              {auction.description.split(/\n+/).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>

            <dl className="mt-7 grid grid-cols-2 gap-4 border-t border-ink-600/70 pt-6 text-sm sm:grid-cols-4">
              <div><dt className="text-dim">Starting bid</dt><dd className="num mt-0.5 font-bold">{formatMoney(auction.startingBid)}</dd></div>
              <div><dt className="text-dim">Min. raise</dt><dd className="num mt-0.5 font-bold">{formatMoney(minIncrement)}</dd></div>
              <div><dt className="text-dim">Opens</dt><dd className="mt-0.5 font-bold">{formatDateTime(auction.startTime)}</dd></div>
              <div><dt className="text-dim">Closes</dt><dd className="mt-0.5 font-bold">{formatDateTime(auction.endTime)}</dd></div>
            </dl>
            {auction.extensions > 0 && (
              <p className="mt-4 flex items-center gap-2 text-xs text-gold">
                <Timer size={14} /> Extended {auction.extensions}× by late bids so nobody could snipe it.
              </p>
            )}
          </div>

          {/* bid history */}
          <div className="panel panel-pad">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Bid history</h2>
              <span className="text-sm text-dim">{bidders.length} {bidders.length === 1 ? "bidder" : "bidders"}</span>
            </div>
            {bidders.length === 0 ? (
              <p className="py-6 text-center text-dim">
                {status === "upcoming" ? "Bidding hasn't opened yet." : "No bids yet — the first one sets the pace."}
              </p>
            ) : (
              <ol className="divide-y divide-ink-600/60">
                {bidders.slice(0, 25).map((bid, index) => {
                  const mine = !!bid.mine;
                  return (
                    <li key={`${bid.userName}-${index}`} className="flex items-center gap-3 py-3">
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${index === 0 ? "bg-win/20 text-win" : "bg-ink-600 text-dim"}`}>
                        {index === 0 ? <Crown size={14} /> : index + 1}
                      </span>
                      <img src={bid.profileImage || "/imageHolder.jpg"} alt="" className="h-9 w-9 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">
                          {bid.userName} {mine && <span className="ml-1 rounded bg-bid/25 px-1.5 py-0.5 text-[10px] text-bid-soft">YOU</span>}
                        </p>
                        {bid.at && <p className="text-xs text-faint">{timeAgo(bid.at, now)}</p>}
                      </div>
                      <p className={`num font-display text-lg font-extrabold ${index === 0 ? "text-win" : "text-fg"}`}>
                        {formatMoney(bid.amount)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        {/* ------------ right: bid panel ------------ */}
        <aside id="bid-panel" className="scroll-mt-24 lg:sticky lg:top-24">
          <div className={`panel overflow-hidden ${closingSoon ? "!border-live/60" : ""} ${isLeader && status === "live" ? "!border-win/60" : ""}`}>
            <div className="bg-gradient-to-br from-bid/25 via-transparent to-live/10 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-dim">
                  {status === "upcoming" ? "Opens in" : status === "live" ? "Closes in" : "Auction"}
                </p>
                <StatusBadge status={status} sold={sold} />
              </div>
              <p className="num mt-1 font-display text-4xl font-extrabold sm:text-5xl">
                <Countdown to={status === "upcoming" ? auction.startTime : auction.endTime} doneText="Ended" />
              </p>
              {status === "live" && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-600" aria-hidden="true">
                  <div className={`h-full rounded-full transition-all ${closingSoon ? "bg-live" : "bg-bid"}`} style={{ width: `${progress}%` }} />
                </div>
              )}

              <div className="mt-6 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm text-dim">{hasBids ? (status === "ended" ? "Final price" : "Current bid") : "Starting bid"}</p>
                  <p key={flashKey} className={`num font-display text-4xl font-extrabold text-gold ${flashKey ? "price-flash" : ""}`}>
                    {formatMoney(hasBids ? auction.currentBid : auction.startingBid)}
                  </p>
                </div>
                <p className="flex items-center gap-1.5 pb-1.5 text-sm text-dim">
                  <Gavel size={15} /> {auction.bidCount || 0}
                </p>
              </div>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              {/* standing */}
              {status === "live" && isLeader && (
                <p className="flex items-center gap-2 rounded-xl bg-win/15 px-3.5 py-3 text-sm font-semibold text-win">
                  <Crown size={17} /> You're the highest bidder. Sit tight.
                </p>
              )}
              {status === "live" && isMember && !isLeader && myId && bidders.some((b) => b.mine) && (
                <p className="flex items-center gap-2 rounded-xl bg-live/15 px-3.5 py-3 text-sm font-semibold text-live">
                  <Hourglass size={17} /> You've been outbid. Raise your offer to get back in front.
                </p>
              )}

              {/* upcoming */}
              {status === "upcoming" && (
                <p className="flex items-start gap-2 rounded-xl bg-sky/10 px-3.5 py-3 text-sm text-sky">
                  <Hourglass size={17} className="mt-0.5 shrink-0" />
                  Bidding opens {formatDateTime(auction.startTime)}. Add it to your watchlist so you don't miss it.
                </p>
              )}

              {/* live: bid form or the reason you can't bid */}
              {status === "live" && !isAuthenticated && (
                <>
                  <p className="text-sm text-dim">Log in or create a free account to place a bid.</p>
                  <button
                    type="button"
                    onClick={() => navigate("/login", { state: { from: location.pathname } })}
                    className="btn-primary btn-lg w-full"
                  >
                    <Lock size={17} /> Log in to bid
                  </button>
                </>
              )}
              {status === "live" && isAdmin && (
                <p className="rounded-xl bg-ink-600/60 px-3.5 py-3 text-sm text-dim">
                  Admin accounts can view auctions but can't bid.
                </p>
              )}
              {status === "live" && isOwner && (
                <div className="space-y-3">
                  <p className="rounded-xl bg-bid/15 px-3.5 py-3 text-sm text-bid-soft">
                    This is your own listing, so bidding is turned off for you. You can still bid on anyone else's items with this same account.
                  </p>
                  <Link to="/view-my-auctions" className="btn-ghost w-full">Manage my listings</Link>
                </div>
              )}

              {canBid && (
                <form onSubmit={askToConfirm} className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {chips.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAmount(String(value))}
                        className={`chip num ${Number(amount) === value ? "chip-on" : ""}`}
                      >
                        {formatMoney(value)}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label htmlFor="bid-amount" className="label">Your bid</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gold">₹</span>
                      <input
                        id="bid-amount"
                        type="number"
                        inputMode="numeric"
                        min={minNextBid}
                        step="any"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="input num !pl-8 font-display text-lg font-bold"
                      />
                    </div>
                    <p className={`hint ${amountTooLow && amount !== "" ? "!text-live" : ""}`}>
                      Minimum bid {formatMoney(minNextBid)}
                    </p>
                  </div>
                  <button type="submit" disabled={placing || amountTooLow} className="btn-primary btn-lg w-full">
                    <Gavel size={18} /> {placing ? "Placing bid…" : `Place bid ${amountTooLow ? "" : formatMoney(numeric)}`}
                  </button>
                  <p className="flex items-start gap-2 text-xs text-faint">
                    <Timer size={13} className="mt-0.5 shrink-0" />
                    A bid in the last 2 minutes extends the auction by 2 minutes.
                  </p>
                </form>
              )}

              {/* ended */}
              {status === "ended" && (
                <>
                  {sold ? (
                    <p className="flex items-center gap-2 rounded-xl bg-win/15 px-3.5 py-3 text-sm font-semibold text-win">
                      <Trophy size={17} />
                      {isLeader ? "You won this auction!" : `Sold to ${bidders[0]?.userName || "the highest bidder"}.`}
                    </p>
                  ) : (
                    <p className="rounded-xl bg-ink-600/60 px-3.5 py-3 text-sm text-dim">This auction ended without any bids.</p>
                  )}
                  {isLeader && (
                    <Link to="/my-bids" className="btn-win w-full">
                      See the seller's payment details
                    </Link>
                  )}
                  {isOwner && !sold && (
                    <Link to="/view-my-auctions" className="btn-primary w-full">Republish this item</Link>
                  )}
                </>
              )}
            </div>
          </div>

          {/* seller view: winner contact */}
          {isOwner && status === "ended" && winner && (
            <div className="panel panel-pad mt-5 space-y-3">
              <p className="flex items-center gap-2 font-bold"><BadgeCheck size={18} className="text-win" /> Winner</p>
              <div className="flex items-center gap-3">
                <img src={winner.profileImage?.url || "/imageHolder.jpg"} alt="" className="h-11 w-11 rounded-xl object-cover" />
                <p className="font-bold">{winner.userName}</p>
              </div>
              <ul className="space-y-2 text-sm text-dim">
                <li className="flex items-center gap-2"><Mail size={15} /><a href={`mailto:${winner.email}`} className="text-fg hover:underline">{winner.email}</a></li>
                <li className="flex items-center gap-2"><Phone size={15} /><a href={`tel:${winner.phone}`} className="text-fg hover:underline">{winner.phone}</a></li>
                <li className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0" /><span className="text-fg">{winner.address}</span></li>
              </ul>
              <p className="text-xs text-faint">They've been emailed your payout details. If they don't pay, you can republish the item from My listings.</p>
            </div>
          )}
        </aside>
      </div>

      {status === "live" && (canBid || !isAuthenticated) && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-ink-600 bg-ink-900/95 px-4 py-3 backdrop-blur lg:hidden">
          <div>
            <p className="text-xs text-dim">{hasBids ? "Current bid" : "Starting bid"}</p>
            <p className="num font-display text-xl font-extrabold text-gold">
              {formatMoney(hasBids ? auction.currentBid : auction.startingBid)}
            </p>
          </div>
          <Countdown to={auction.endTime} className="text-sm font-bold" />
          <button
            type="button"
            onClick={() => document.getElementById("bid-panel")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="btn-primary"
          >
            Bid now
          </button>
        </div>
      )}

      <Modal open={confirmOpen} onClose={() => !placing && setConfirmOpen(false)} title="Confirm your bid" width="max-w-md">
        <p className="text-dim">
          You're bidding <span className="num font-bold text-gold">{formatMoney(numeric)}</span> on{" "}
          <span className="font-semibold text-fg">{auction.title}</span>.
        </p>
        {looksLikeTypo && (
          <p className="mt-3 rounded-xl bg-live/15 px-3.5 py-3 text-sm text-live">
            That's much higher than the current price. Double-check you haven't added an extra zero.
          </p>
        )}
        <p className="mt-3 text-sm text-faint">Bids are binding: if you win, you're expected to pay the seller.</p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => setConfirmOpen(false)} disabled={placing} className="btn-ghost flex-1">Cancel</button>
          <button type="button" onClick={confirmBid} disabled={placing} className="btn-primary flex-1">
            {placing ? "Placing…" : "Confirm bid"}
          </button>
        </div>
      </Modal>
    </Page>
  );
};

export default AuctionItem;
