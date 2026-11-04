import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { deletePaymentProof, getSinglePaymentProofDetail, updatePaymentProof } from "@/store/slices/superAdminSlice";
import { formatDate, formatMoney } from "@/lib/format";
import Modal from "@/custom-components/Modal";

const STATUS_CLASS = { Pending: "badge-gold", Approved: "badge-upcoming", Settled: "badge-win", Rejected: "badge-live" };

const UpdateModal = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const { singlePaymentProof: proof, loading } = useSelector((s) => s.superAdmin);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("Pending");

  useEffect(() => {
    setAmount(proof.amount ?? "");
    setStatus(proof.status || "Pending");
  }, [proof]);

  const save = async () => {
    await dispatch(updatePaymentProof(proof._id, status, amount));
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Review payment proof" width="max-w-lg">
      <div className="space-y-4">
        <div>
          <span className="label">Member ID</span>
          <input disabled value={proof.userId || ""} className="input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pp-amount">Amount (₹)</label>
            <input id="pp-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="pp-status">Status</label>
            <select id="pp-status" value={status} onChange={(e) => setStatus(e.target.value)} className="input">
              {["Pending", "Approved", "Rejected", "Settled"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <span className="label">Member's note</span>
          <textarea disabled rows={3} value={proof.comment || ""} className="input" />
        </div>
        {proof.proof?.url && (
          <a href={proof.proof.url} target="_blank" rel="noreferrer" className="btn-ghost w-full">Open screenshot</a>
        )}
        <p className="text-xs text-faint">Approved proofs are applied to the member's balance automatically within a minute.</p>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="button" onClick={save} disabled={loading} className="btn-primary flex-1">{loading ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </Modal>
  );
};

const PaymentProofs = () => {
  const { paymentProofs, singlePaymentProof } = useSelector((s) => s.superAdmin);
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    if (singlePaymentProof && Object.keys(singlePaymentProof).length > 0) setOpen(true);
  }, [singlePaymentProof]);

  return (
    <>
      <div className="panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs text-dim">
            <tr className="border-b border-ink-600/70">
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Sent</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-600/50">
            {paymentProofs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-dim">No payment proofs yet.</td></tr>
            ) : (
              paymentProofs.map((p) => (
                <tr key={p._id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{p.user?.userName || "Unknown member"}</p>
                    <p className="text-xs text-faint">{p.user?.email || String(p.userId)}</p>
                  </td>
                  <td className="num px-4 py-3 font-bold">{formatMoney(p.amount)}</td>
                  <td className="px-4 py-3 text-dim">{formatDate(p.uploadedAt)}</td>
                  <td className="px-4 py-3"><span className={STATUS_CLASS[p.status] || "badge-ended"}>{p.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="btn-ghost btn-sm" onClick={() => dispatch(getSinglePaymentProofDetail(p._id))}>Review</button>
                      <button type="button" className="btn-danger btn-sm" onClick={() => window.confirm("Delete this proof?") && dispatch(deletePaymentProof(p._id))}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <UpdateModal open={open} onClose={() => { setOpen(false); dispatch({ type: "superAdmin/clearAllErrors" }); }} />
    </>
  );
};

export default PaymentProofs;
