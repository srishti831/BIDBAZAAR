import React from "react";

const StatusBadge = ({ status, sold = false }) => {
  if (status === "live") {
    return (
      <span className="badge-live">
        <span className="live-dot" /> LIVE
      </span>
    );
  }
  if (status === "upcoming") return <span className="badge-upcoming">Upcoming</span>;
  return sold ? <span className="badge-win">Sold</span> : <span className="badge-ended">Ended</span>;
};

export default StatusBadge;
