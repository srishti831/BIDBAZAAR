import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowRight, Gavel, Plus, ShieldCheck, Timer, Zap } from "lucide-react";
import { useNow } from "@/hooks/useNow";
import { AUCTION_CATEGORIES, formatMoney, getStatus } from "@/lib/format";
import { Page, CardSkeletons, Stat } from "@/custom-components/Page";
import AuctionCard from "@/custom-components/AuctionCard";
import Countdown from "@/custom-components/Countdown";
import StatusBadge from "@/custom-components/StatusBadge";

const Spotlight = ({ auction }) => {
  const now = useNow();
  const status = getStatus(auction, now);
  const hasBids = auction.currentBid > 0;
  return (
    <Link
      to={`/auction/item/${auction._id}`}
      className="panel group relative block overflow-hidden transition hover:border-bid-soft/70"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-950">
        <img src={auction.image?.url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-2xl" />
        <img src={auction.image?.url} alt={auction.title} className="relative h-full w-full object-contain p-5 transition duration-300 group-hover:scale-105" />
        <div className="absolute left-4 top-4"><StatusBadge status={status} /></div>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-xs font-semibold text-faint">{auction.category}</p>
          <h3 className="mt-1 line-clamp-2 text-2xl font-extrabold leading-tight">{auction.title}</h3>
          <p className="mt-2 text-sm text-dim">{auction.bidCount || 0} {auction.bidCount === 1 ? "bid" : "bids"} so far</p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs text-dim">{hasBids ? "Current bid" : "Starting bid"}</p>
          <p className="num font-display text-3xl font-extrabold text-gold">
            {formatMoney(hasBids ? auction.currentBid : auction.startingBid)}
          </p>
          <p className="mt-1 text-sm text-dim">
            {status === "upcoming" ? "Opens in " : "Closes in "}
            <Countdown to={status === "upcoming" ? auction.startTime : auction.endTime} className="font-bold" />
          </p>
        </div>
      </div>
    </Link>
  );
};

const Home = () => {
  const { allAuctions, listLoaded } = useSelector((s) => s.auction);
  const { isAuthenticated, user, leaderboard } = useSelector((s) => s.user);
  const now = useNow();
  const tick = Math.floor(now / 10000);

  const { live, upcoming, spotlight, stats } = useMemo(() => {
    const byStatus = (s) => allAuctions.filter((a) => getStatus(a, now) === s);
    const live = byStatus("live").sort((a, b) => new Date(a.endTime) - new Date(b.endTime));
    const upcoming = byStatus("upcoming").sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    const hottest = [...live].sort((a, b) => (b.bidCount || 0) - (a.bidCount || 0))[0];
    return {
      live,
      upcoming,
      spotlight: hottest || upcoming[0] || null,
      stats: {
        live: live.length,
        upcoming: upcoming.length,
        bids: allAuctions.reduce((sum, a) => sum + (a.bidCount || 0), 0),
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAuctions, tick]);

  const canSell = isAuthenticated && user?.role === "User";

  return (
    <Page>
      {/* hero */}
      <section className="grid items-center gap-8 py-4 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-10">
        <div>
          <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            Every bid counts. Make yours the last one.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-dim">
            Real-time prices, fair closing rules and instant outbid alerts. Bid on anything that's live, or list your own item in a couple of minutes, all from one account.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/auctions?status=live" className="btn-primary btn-lg">
              <Gavel size={18} /> Browse live auctions
            </Link>
            {canSell ? (
              <Link to="/create-auction" className="btn-ghost btn-lg"><Plus size={18} /> Sell an item</Link>
            ) : !isAuthenticated ? (
              <Link to="/sign-up" className="btn-ghost btn-lg">Create free account</Link>
            ) : null}
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-dim">
            <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-win" /> Sellers can't bid on their own items</li>
            <li className="flex items-center gap-2"><Timer size={16} className="text-gold" /> Anti-sniping extensions</li>
            <li className="flex items-center gap-2"><Zap size={16} className="text-bid-soft" /> Live price updates</li>
          </ul>
        </div>

        <div>
          {!listLoaded ? (
            <div className="skeleton h-[420px] w-full" />
          ) : spotlight ? (
            <Spotlight auction={spotlight} />
          ) : (
            <div className="panel panel-pad grid min-h-[320px] place-items-center text-center">
              <div>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bid/15 text-bid-soft"><Gavel size={26} /></span>
                <p className="mt-4 text-xl font-bold">The floor is quiet right now</p>
                <p className="mt-1 text-dim">List the first item and set the pace.</p>
                <Link to={canSell ? "/create-auction" : "/sign-up"} className="btn-primary mt-5">
                  {canSell ? "Sell an item" : "Get started"}
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* stats */}
      <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Marketplace activity">
        <Stat label="Live right now" value={stats.live} tone="text-live" icon={Zap} />
        <Stat label="Starting soon" value={stats.upcoming} tone="text-sky" icon={Timer} />
        <Stat label="Bids placed" value={stats.bids.toLocaleString("en-IN")} tone="text-win" icon={Gavel} />
      </section>

      {/* ending soon */}
      <section className="mt-14">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Ending soon</h2>
          <Link to="/auctions?status=live" className="flex items-center gap-1 text-sm font-semibold text-bid-soft hover:underline">
            See all live <ArrowRight size={15} />
          </Link>
        </div>
        {!listLoaded ? (
          <CardSkeletons count={4} />
        ) : live.length === 0 ? (
          <p className="panel panel-pad text-dim">Nothing is live at the moment. Check what's starting soon below.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {live.slice(0, 4).map((a) => <AuctionCard key={a._id} auction={a} />)}
          </div>
        )}
      </section>

      {/* categories */}
      <section className="mt-14">
        <h2 className="mb-4 text-2xl font-extrabold sm:text-3xl">Shop by category</h2>
        <div className="flex flex-wrap gap-2.5">
          {AUCTION_CATEGORIES.map((c) => (
            <Link key={c} to={`/auctions?category=${encodeURIComponent(c)}`} className="chip !px-4 !py-2 text-sm">
              {c}
            </Link>
          ))}
        </div>
      </section>

      {/* starting soon */}
      {upcoming.length > 0 && (
        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Starting soon</h2>
            <Link to="/auctions?status=upcoming" className="flex items-center gap-1 text-sm font-semibold text-bid-soft hover:underline">
              See all <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.slice(0, 4).map((a) => <AuctionCard key={a._id} auction={a} />)}
          </div>
        </section>
      )}

      {/* leaderboard + how it works */}
      <section className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="panel panel-pad">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-extrabold">Top bidders</h2>
            <Link to="/leaderboard" className="text-sm font-semibold text-bid-soft hover:underline">Full leaderboard</Link>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-dim">No wins yet. The first winner takes the top spot.</p>
          ) : (
            <ol className="space-y-3">
              {leaderboard.slice(0, 5).map((u, i) => (
                <li key={u._id} className="flex items-center gap-3">
                  <span className="num w-5 text-center font-display font-extrabold text-faint">{i + 1}</span>
                  <img src={u.profileImage?.url || "/imageHolder.jpg"} alt="" className="h-9 w-9 rounded-lg object-cover" />
                  <span className="flex-1 truncate font-semibold">{u.userName}</span>
                  <span className="num font-bold text-gold">{formatMoney(u.moneySpent)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="panel panel-pad">
          <h2 className="mb-4 text-xl font-extrabold">How it works</h2>
          <ol className="space-y-4">
            {[
              ["Sign up once", "One account lets you bid and sell. Payout details are only asked for when you list something."],
              ["Bid with confidence", "See the minimum next bid, get alerted if you're outbid, and watch the clock with the server's time."],
              ["Win and pay the seller", "The winner gets the seller's contact and payment details by email and under My bids."],
            ].map(([title, text], i) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bid/20 font-display font-extrabold text-bid-soft">{i + 1}</span>
                <div>
                  <p className="font-bold">{title}</p>
                  <p className="text-sm text-dim">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </Page>
  );
};

export default Home;
