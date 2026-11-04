import React from "react";
import { useNow } from "@/hooks/useNow";
import { formatCountdown } from "@/lib/format";

// Ticks from the shared server-synced clock. Turns coral in the final 5 minutes.
const Countdown = ({ to, className = "", urgentBelowMs = 5 * 60 * 1000, doneText = "Ended" }) => {
  const now = useNow();
  const ms = new Date(to).getTime() - now;
  if (ms <= 0) return <span className={`num ${className}`}>{doneText}</span>;
  const urgent = ms < urgentBelowMs;
  return (
    <span className={`num ${urgent ? "text-live" : ""} ${className}`}>
      {formatCountdown(ms)}
    </span>
  );
};

export default Countdown;
