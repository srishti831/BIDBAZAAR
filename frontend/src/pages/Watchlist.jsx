import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Heart } from "lucide-react";
import { getWatchlist } from "@/store/slices/auctionSlice";
import { Page, PageHeader, EmptyState, CardSkeletons } from "@/custom-components/Page";
import AuctionCard from "@/custom-components/AuctionCard";

const Watchlist = () => {
  const dispatch = useDispatch();
  const { watchlistItems, watchlistLoaded } = useSelector((s) => s.auction);
  const { user } = useSelector((s) => s.user);

  useEffect(() => {
    dispatch(getWatchlist());
  }, [dispatch]);

  // Un-hearting an item removes it from the page straight away.
  const watching = new Set((user.watchlist || []).map(String));
  const items = watchlistItems.filter((a) => watching.has(String(a._id)));

  return (
    <Page>
      <PageHeader title="Watchlist" subtitle="Auctions you're keeping an eye on." />
      {!watchlistLoaded ? (
        <CardSkeletons count={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nothing on your watchlist yet"
          text="Tap the heart on any auction to save it here and come back when it's about to start or end."
          actionLabel="Browse auctions"
          actionTo="/auctions"
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((auction) => (
            <AuctionCard key={auction._id} auction={auction} />
          ))}
        </div>
      )}
    </Page>
  );
};

export default Watchlist;
