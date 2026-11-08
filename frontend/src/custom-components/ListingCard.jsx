import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Eye, RotateCcw, Trash2 } from "lucide-react";
import { deleteAuction } from "@/store/slices/auctionSlice";
import { useNow } from "@/hooks/useNow";
import { formatMoney, getStatus } from "@/lib/format";
import Countdown from "./Countdown";
import StatusBadge from "./StatusBadge";
import RepublishModal from "./RepublishModal";
import Modal from "./Modal";

const ListingCard = ({ auction }) => {
  const dispatch = useDispatch();
  const now = useNow();
  const status = getStatus(auction, now);
  const hasBids = auction.currentBid > 0;
  const sold = status === "ended" && hasBids;
  const [republishOpen, setRepublishOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = !(auction.bidCount > 0 && status !== "upcoming");

  const remove = async () => {
    setDeleting(true);
    const ok = await dispatch(deleteAuction(auction._id));
    setDeleting(false);
    if (ok) setDeleteOpen(false);
  };

  return (
    <div className="panel flex flex-col overflow-hidden sm:flex-row">
      <Link to={`/auction/item/${auction._id}`} className="relative aspect-[4/3] bg-ink-950 sm:aspect-auto sm:w-48 sm:shrink-0">
        <img src={auction.image?.url} alt={auction.title} className="h-full w-full object-contain p-3" />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} sold={sold} />
          <span className="text-xs text-faint">{auction.category}</span>
        </div>
        <h3 className="line-clamp-2 text-lg font-bold">{auction.title}</h3>

        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-dim">{hasBids ? (status === "ended" ? "Sold for" : "Current") : "Starting"}</dt>
            <dd className="num font-bold text-gold">{formatMoney(hasBids ? auction.currentBid : auction.startingBid)}</dd>
          </div>
          <div>
            <dt className="text-xs text-dim">Bids</dt>
            <dd className="num font-bold">{auction.bidCount || 0}</dd>
          </div>
          <div>
            <dt className="text-xs text-dim">{status === "upcoming" ? "Starts in" : status === "live" ? "Ends in" : "Top bidder"}</dt>
            <dd className="truncate font-bold">
              {status === "ended" ? auction.leadingBidder || "—" : (
                <Countdown to={status === "upcoming" ? auction.startTime : auction.endTime} />
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <Link to={`/auction/item/${auction._id}`} className="btn-ghost btn-sm"><Eye size={15} /> View</Link>
          {status === "ended" && !hasBids && (
            <button type="button" onClick={() => setRepublishOpen(true)} className="btn-primary btn-sm">
              <RotateCcw size={15} /> Republish
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={!canDelete}
            title={canDelete ? "Delete this listing" : "Auctions with bids can't be deleted"}
            className="btn-danger btn-sm ml-auto"
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
        {status !== "ended" && (
          <p className="text-xs text-faint">If nobody bids, you can republish this item once the auction has ended.</p>
        )}
        {sold && <p className="text-xs text-faint">Sold - the winner has been emailed your payment details.</p>}
      </div>

      <RepublishModal auction={auction} open={republishOpen} onClose={() => setRepublishOpen(false)} />
      <Modal open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title="Delete this listing?" width="max-w-md">
        <p className="text-dim">“{auction.title}” and its bid history will be removed permanently.</p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => setDeleteOpen(false)} disabled={deleting} className="btn-ghost flex-1">Keep it</button>
          <button type="button" onClick={remove} disabled={deleting} className="btn-live flex-1">{deleting ? "Deleting…" : "Delete"}</button>
        </div>
      </Modal>
    </div>
  );
};

export default ListingCard;
