import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Package, Plus } from "lucide-react";
import { getMyAuctionItems } from "@/store/slices/auctionSlice";
import { useNow } from "@/hooks/useNow";
import { getStatus } from "@/lib/format";
import { Page, PageHeader, EmptyState, CardSkeletons } from "@/custom-components/Page";
import ListingCard from "@/custom-components/ListingCard";

const TABS = [
  ["all", "All"],
  ["live", "Live"],
  ["upcoming", "Upcoming"],
  ["ended", "Ended"],
];

const ViewMyAuctions = () => {
  const dispatch = useDispatch();
  const { myAuctions, myAuctionsLoaded } = useSelector((s) => s.auction);
  const [tab, setTab] = useState("all");
  const now = useNow();
  const tick = Math.floor(now / 5000);

  useEffect(() => {
    dispatch(getMyAuctionItems());
  }, [dispatch]);

  const { shown, counts } = useMemo(() => {
    const counts = { all: myAuctions.length, live: 0, upcoming: 0, ended: 0 };
    myAuctions.forEach((a) => { counts[getStatus(a, now)] += 1; });
    return { shown: tab === "all" ? myAuctions : myAuctions.filter((a) => getStatus(a, now) === tab), counts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myAuctions, tab, tick]);

  return (
    <Page>
      <PageHeader
        title="My listings"
        subtitle="Everything you're selling. Ended items can be republished for free."
        actions={<Link to="/create-auction" className="btn-primary"><Plus size={17} /> New listing</Link>}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id} className={`chip ${tab === id ? "chip-on" : ""}`}>
            {label} <span className="num text-faint">{counts[id]}</span>
          </button>
        ))}
      </div>

      {!myAuctionsLoaded ? (
        <CardSkeletons count={3} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Package}
          title={tab === "all" ? "You haven't listed anything yet" : `No ${tab} listings`}
          text="Listing takes about two minutes: a photo, a price and a schedule."
          actionLabel="Sell an item"
          actionTo="/create-auction"
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {shown.map((a) => <ListingCard key={a._id} auction={a} />)}
        </div>
      )}
    </Page>
  );
};

export default ViewMyAuctions;
