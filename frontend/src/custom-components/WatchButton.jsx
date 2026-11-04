import React from "react";
import { Heart } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toggleWatch } from "@/store/slices/userSlice";
import { getWatchlist } from "@/store/slices/auctionSlice";

// Heart toggle. Guests are sent to log in; sellers can still watch other items.
const WatchButton = ({ auctionId, variant = "icon" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((s) => s.user);
  const watching = !!user?.watchlist?.some((id) => String(id) === String(auctionId));

  const onClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return navigate("/login", { state: { from: `/auction/item/${auctionId}` } });
    if (user.role !== "User") return;
    const ok = await dispatch(toggleWatch(auctionId));
    if (ok) dispatch(getWatchlist());
  };

  if (variant === "button") {
    return (
      <button type="button" onClick={onClick} className="btn-ghost btn-sm">
        <Heart size={15} className={watching ? "fill-live text-live" : ""} />
        {watching ? "Watching" : "Watch"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={watching ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={watching}
      className="grid h-9 w-9 place-items-center rounded-full bg-ink-950/70 text-fg backdrop-blur transition hover:bg-ink-950"
    >
      <Heart size={17} className={watching ? "fill-live text-live" : ""} />
    </button>
  );
};

export default WatchButton;
