import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { CheckCircle2, ImagePlus } from "lucide-react";
import { getMyCommission, postCommissionProof } from "@/store/slices/commissionSlice";
import { formatDate, formatMoney } from "@/lib/format";
import { Page, PageHeader } from "@/custom-components/Page";

const STATUS_CLASS = {
  Pending: "badge-gold",
  Approved: "badge-upcoming",
  Settled: "badge-win",
  Rejected: "badge-live",
};

const SubmitCommission = () => {
  const dispatch = useDispatch();
  const { loading, loaded, unpaidCommission, commissionRate, proofs } = useSelector((s) => s.commission);
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [proof, setProof] = useState(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    dispatch(getMyCommission());
  }, [dispatch]);

  useEffect(() => {
    if (loaded && unpaidCommission > 0 && amount === "") setAmount(String(unpaidCommission));
  }, [loaded, unpaidCommission]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return toast.error("Please choose a PNG, JPG or WEBP screenshot.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Screenshot must be smaller than 5 MB.");
    setProof(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!proof) return toast.error("Attach a screenshot of your payment.");
    const n = Number(amount);
    if (!(n > 0)) return toast.error("Enter the amount you paid.");
    if (n > unpaidCommission) return toast.error(`You can't pay more than you owe (${formatMoney(unpaidCommission)}).`);
    const data = new FormData();
    data.append("proof", proof);
    data.append("amount", amount);
    data.append("comment", comment);
    const ok = await dispatch(postCommissionProof(data));
    if (ok) {
      setProof(null);
      setPreview("");
      setComment("");
      setAmount("");
    }
  };

  const pending = proofs.filter((p) => p.status === "Pending" || p.status === "Approved").reduce((s, p) => s + p.amount, 0);

  return (
    <Page narrow>
      <PageHeader title="Commission" subtitle={`Sellers pay ${commissionRate * 100}% of each sale to the platform once the buyer has paid.`} />

      <div className={`panel panel-pad mb-6 flex items-center justify-between gap-4 ${unpaidCommission > 0 ? "!border-live/50" : "!border-win/40"}`}>
        <div>
          <p className="text-sm text-dim">Currently owed</p>
          <p className={`num font-display text-4xl font-extrabold ${unpaidCommission > 0 ? "text-live" : "text-win"}`}>{formatMoney(unpaidCommission)}</p>
          {pending > 0 && <p className="mt-1 text-xs text-dim">{formatMoney(pending)} of payments awaiting review</p>}
        </div>
        {unpaidCommission === 0 && loaded && <span className="badge-win"><CheckCircle2 size={14} /> All settled</span>}
      </div>

      {unpaidCommission > 0 ? (
        <form onSubmit={submit} className="panel panel-pad space-y-4">
          <h2 className="text-lg font-bold">Upload payment proof</h2>
          <p className="text-sm text-dim">Pay the platform, then upload a screenshot. An admin reviews it, usually within 24 hours.</p>
          <div>
            <label htmlFor="c-amount" className="label">Amount paid (₹)</label>
            <input id="c-amount" type="number" min="1" step="any" max={unpaidCommission} required value={amount} onChange={(e) => setAmount(e.target.value)} className="input num" />
          </div>
          <div>
            <span className="label">Payment screenshot</span>
            <label htmlFor="c-proof" className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-500 bg-ink-900/50 p-4 text-center hover:border-bid-soft">
              {preview ? <img src={preview} alt="Screenshot preview" className="max-h-48 rounded-lg object-contain" /> : (<><ImagePlus size={26} className="text-bid-soft" /><span className="text-sm font-semibold">Click to choose a screenshot</span></>)}
            </label>
            <input id="c-proof" type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} className="sr-only" />
          </div>
          <div>
            <label htmlFor="c-comment" className="label">Note (transaction ID, date…)</label>
            <textarea id="c-comment" required rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className="input" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">{loading ? "Uploading…" : "Submit proof"}</button>
        </form>
      ) : (
        loaded && (
          <p className="panel panel-pad text-dim">
            Nothing to pay right now. <Link to="/create-auction" className="font-semibold text-bid-soft hover:underline">List another item</Link>.
          </p>
        )
      )}

      {proofs.length > 0 && (
        <div className="panel panel-pad mt-6">
          <h2 className="mb-3 text-lg font-bold">Your submissions</h2>
          <ul className="divide-y divide-ink-600/60">
            {proofs.map((p) => (
              <li key={p._id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="num font-bold">{formatMoney(p.amount)}</p>
                  <p className="text-xs text-faint">{formatDate(p.uploadedAt)}</p>
                </div>
                <span className={STATUS_CLASS[p.status] || "badge-ended"}>{p.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Page>
  );
};

export default SubmitCommission;
