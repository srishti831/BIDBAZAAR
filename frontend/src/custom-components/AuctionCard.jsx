import React from "react";
import { Link } from "react-router-dom";
import { Gavel } from "lucide-react";
import { useSelector } from "react-redux";
import { useNow } from "@/hooks/useNow";
import { formatMoney, getStatus } from "@/lib/format";
import Countdown from "./Countdown";
import StatusBadge from "./StatusBadge";
import WatchButton from "./WatchButton";

const AuctionCard = ({ auction }) => {
  const now = useNow();
  const { user } = useSelector((s) => s.user);
  const status = getStatus(auction, now);
  const isMine = !!user?._id && String(auction.createdBy) === String(user._id);
  const leading = !!user?._id && auction.highestBidder && String(auction.highestBidder) === String(user._id);
  const hasBids = auction.currentBid > 0;
  const sold = status === "ended" && hasBids;

  return (
    <Link
      to={`/auction/item/${auction._id}`}
      className={`panel group flex flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:border-bid-soft/70 hover:shadow-[0_18px_40px_-18px_rgba(124,92,255,0.55)] ${
        leading && status === "live" ? "!border-win/70" : ""
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-950">
        <img
          src={auction.image?.url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-30 blur-2xl"
        />
        <img
          src={auction.image?.url}
          alt={auction.title}
          loading="lazy"
          className={`relative h-full w-full object-contain p-3 transition duration-300 group-hover:scale-105 ${
            status === "ended" ? "grayscale-[40%]" : ""
          }`}
        />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <StatusBadge status={status} sold={sold} />
          {isMine && <span className="badge bg-bid/25 text-bid-soft">Your listing</span>}
        </div>
        {!isMine && user?.role !== "Super Admin" && (
          <div className="absolute right-3 top-3">
            <WatchButton auctionId={auction._id} />
          </div>
        )}
        {leading && status === "live" && (
          <span className="badge-win absolute bottom-3 left-3">You're leading</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-semibold text-faint">{auction.category}</p>
          <h3 className="mt-0.5 line-clamp-2 text-lg font-bold leading-snug group-hover:text-bid-soft">
            {auction.title}
          </h3>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            <p className="text-xs text-dim">{hasBids ? "Current bid" : "Starting bid"}</p>
            <p className="num font-display text-2xl font-extrabold text-gold">
              {formatMoney(hasBids ? auction.currentBid : auction.startingBid)}
            </p>
          </div>
          <p className="flex items-center gap-1.5 pb-1 text-xs text-dim">
            <Gavel size={14} /> {auction.bidCount || 0} {auction.bidCount === 1 ? "bid" : "bids"}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-ink-600/70 pt-3 text-sm">
          <span className="text-dim">
            {status === "upcoming" ? "Starts in" : status === "live" ? "Ends in" : "Auction"}
          </span>
          <Countdown
            to={status === "upcoming" ? auction.startTime : auction.endTime}
            className="font-bold"
          />
        </div>
      </div>
    </Link>
  );
};

export default AuctionCard;
