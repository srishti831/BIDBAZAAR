import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { republishAuction } from "@/store/slices/auctionSlice";
import { formatMoney } from "@/lib/format";
import Modal from "./Modal";
import SchedulePicker, { scheduleToPayload, validateSchedule } from "./SchedulePicker";

const RepublishModal = ({ auction, open, onClose }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((s) => s.auction);
  const [schedule, setSchedule] = useState({ startNow: true, start: null, end: null });
  const [startingBid, setStartingBid] = useState(String(auction.startingBid));

  useEffect(() => {
    if (open) {
      setSchedule({ startNow: true, start: null, end: null });
      setStartingBid(String(auction.startingBid));
    }
  }, [open, auction.startingBid]);

  const submit = async (e) => {
    e.preventDefault();
    const problem = validateSchedule(schedule);
    if (problem) return toast.error(problem);
    if (!(Number(startingBid) > 0)) return toast.error("Enter a starting bid above zero.");
    const ok = await dispatch(
      republishAuction(auction._id, { ...scheduleToPayload(schedule), startingBid: Number(startingBid) })
    );
    if (ok) onClose();
  };

  return (
    <Modal open={open} onClose={() => !loading && onClose()} title="Republish auction" width="max-w-xl">
      <form onSubmit={submit} className="space-y-5">
        <p className="text-sm text-dim">
          “{auction.title}” goes back up with a clean slate: old bids are cleared, and any commission or win stats from the previous sale are reversed. It's free.
        </p>
        <div>
          <label htmlFor="rp-bid" className="label">Starting bid (₹)</label>
          <input id="rp-bid" type="number" min="1" step="any" value={startingBid} onChange={(e) => setStartingBid(e.target.value)} className="input num" />
          <p className="hint">Was {formatMoney(auction.startingBid)}. Lower it if it didn't attract bids.</p>
        </div>
        <SchedulePicker value={schedule} onChange={setSchedule} />
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={loading} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? "Republishing…" : schedule.startNow ? "Republish now" : "Schedule republish"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RepublishModal;
