import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useNow } from "@/hooks/useNow";
import { formatMoney } from "@/lib/format";
import Countdown from "@/custom-components/Countdown";

// A scrolling strip of auctions that are live right now, soonest-ending first.
const LiveTicker = () => {
  const { allAuctions } = useSelector((s) => s.auction);
  const now = useNow();

  const live = useMemo(
    () =>
      allAuctions
        .filter(
          (a) =>
            new Date(a.startTime).getTime() <= now && new Date(a.endTime).getTime() > now
        )
        .sort((a, b) => new Date(a.endTime) - new Date(b.endTime))
        .slice(0, 10),
    // recompute when the list changes or a minute passes (not every second)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allAuctions, Math.floor(now / 60000)]
  );

  if (live.length === 0) return null;
  // Repeat short lists so the strip always spans the screen, then double it
  // so the -50% scroll loops seamlessly.
  const half = Array.from({ length: Math.ceil(6 / live.length) }).flatMap(() => live);
  const loop = [...half, ...half];

  return (
    <div className="ticker overflow-hidden border-b border-ink-600/60 bg-ink-950/70" aria-label="Live auctions">
      <div className="ticker-track flex w-max items-center gap-10 py-2 pl-6 text-sm">
        {loop.map((a, i) => (
          <Link
            key={`${a._id}-${i}`}
            to={`/auction/item/${a._id}`}
            className="flex items-center gap-2.5 whitespace-nowrap text-dim hover:text-fg"
            tabIndex={i >= half.length ? -1 : 0}
            aria-hidden={i >= half.length}
          >
            <span className="live-dot" />
            <span className="max-w-[220px] truncate font-semibold text-fg">{a.title}</span>
            <span className="num font-bold text-gold">
              {formatMoney(a.currentBid > 0 ? a.currentBid : a.startingBid)}
            </span>
            <Countdown to={a.endTime} className="text-xs font-semibold" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default LiveTicker;
