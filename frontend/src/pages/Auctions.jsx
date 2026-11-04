import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Gavel, Search, X } from "lucide-react";
import { useNow } from "@/hooks/useNow";
import { AUCTION_CATEGORIES, getStatus } from "@/lib/format";
import { Page, PageHeader, EmptyState, CardSkeletons } from "@/custom-components/Page";
import AuctionCard from "@/custom-components/AuctionCard";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "live", label: "Live now" },
  { id: "upcoming", label: "Upcoming" },
  { id: "ended", label: "Ended" },
];

const priceOf = (a) => (a.currentBid > 0 ? a.currentBid : a.startingBid);

const SORTERS = {
  soon: (now) => (a, b) => {
    const rank = (x) => ({ live: 0, upcoming: 1, ended: 2 })[getStatus(x, now)];
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    const s = getStatus(a, now);
    if (s === "live") return new Date(a.endTime) - new Date(b.endTime);
    if (s === "upcoming") return new Date(a.startTime) - new Date(b.startTime);
    return new Date(b.endTime) - new Date(a.endTime);
  },
  new: () => (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  low: () => (a, b) => priceOf(a) - priceOf(b),
  high: () => (a, b) => priceOf(b) - priceOf(a),
  bids: () => (a, b) => (b.bidCount || 0) - (a.bidCount || 0),
};

const Auctions = () => {
  const { allAuctions, listLoaded } = useSelector((s) => s.auction);
  const [params, setParams] = useSearchParams();
  const now = useNow();

  const q = params.get("q") || "";
  const category = params.get("category") || "";
  const status = params.get("status") || "all";
  const sort = params.get("sort") || "soon";

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value && value !== "all" && !(key === "sort" && value === "soon")) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const tick = Math.floor(now / 5000);
  const { results, counts } = useMemo(() => {
    const term = q.trim().toLowerCase();
    const matchesBase = (a) =>
      (!category || a.category === category) &&
      (!term || a.title.toLowerCase().includes(term) || a.description?.toLowerCase().includes(term));
    const base = allAuctions.filter(matchesBase);
    const counts = { all: base.length, live: 0, upcoming: 0, ended: 0 };
    base.forEach((a) => {
      counts[getStatus(a, now)] += 1;
    });
    const filtered = status === "all" ? base : base.filter((a) => getStatus(a, now) === status);
    const sorter = (SORTERS[sort] || SORTERS.soon)(now);
    return { results: [...filtered].sort(sorter), counts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAuctions, q, category, status, sort, tick]);

  const filtersActive = q || category || status !== "all";

  return (
    <Page>
      <PageHeader title="Auctions" subtitle="Everything that's live, starting soon, or recently closed." />

      <div className="panel mb-6 space-y-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              type="search"
              value={q}
              onChange={(e) => update("q", e.target.value)}
              placeholder="Search by title or description"
              aria-label="Search auctions"
              className="input !pl-10"
            />
          </div>
          <select value={category} onChange={(e) => update("category", e.target.value)} aria-label="Category" className="input md:w-56">
            <option value="">All categories</option>
            {AUCTION_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => update("sort", e.target.value)} aria-label="Sort by" className="input md:w-52">
            <option value="soon">Ending soonest</option>
            <option value="new">Newest listed</option>
            <option value="bids">Most bids</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => update("status", tab.id)}
              aria-pressed={status === tab.id}
              className={`chip ${status === tab.id ? "chip-on" : ""}`}
            >
              {tab.id === "live" && <span className="live-dot" />}
              {tab.label}
              <span className="num text-faint">{counts[tab.id]}</span>
            </button>
          ))}
          {filtersActive && (
            <button type="button" onClick={() => setParams({}, { replace: true })} className="chip ml-auto">
              <X size={13} /> Clear filters
            </button>
          )}
        </div>
      </div>

      {!listLoaded ? (
        <CardSkeletons />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title={filtersActive ? "Nothing matches those filters" : "No auctions yet"}
          text={filtersActive ? "Try a different search, or clear the filters." : "Be the first to list something."}
        >
          {filtersActive && (
            <button type="button" onClick={() => setParams({}, { replace: true })} className="btn-ghost mt-2">
              Clear filters
            </button>
          )}
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((auction) => (
            <AuctionCard key={auction._id} auction={auction} />
          ))}
        </div>
      )}
    </Page>
  );
};

export default Auctions;
