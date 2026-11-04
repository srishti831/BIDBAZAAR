import React from "react";

const Spinner = ({ label = "Loading…" }) => (
  <div
    role="status"
    className="flex min-h-[320px] w-full flex-col items-center justify-center gap-3"
  >
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-ink-600 border-t-bid" />
    <p className="text-sm text-dim">{label}</p>
  </div>
);

export default Spinner;
