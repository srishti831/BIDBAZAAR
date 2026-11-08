import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { AlertTriangle, CheckCircle2, Copy, ImagePlus } from "lucide-react";
import { getMyCommission, getPaymentInfo, postCommissionProof } from "@/store/slices/commissionSlice";
import { formatDate, formatMoney } from "@/lib/format";
import { Page, PageHeader } from "@/custom-components/Page";

const STATUS_CLASS = {
  Pending: "badge-gold",
  Approved: "badge-upcoming",
  Settled: "badge-win",
  Rejected: "badge-live",
};

const copy = (text) => {
  navigator.clipboard
    ?.writeText(String(text))
    .then(() => toast.success("Copied"))
    .catch(() => toast.error("Could not copy"));
};

const Row = ({ label, value }) =>
  value ? (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-faint">{label}</p>
        <p className="num break-all font-semibold">{value}</p>
      </div>
      <button type="button" onClick={() => copy(value)} className="btn-ghost btn-sm shrink-0" aria-label={`Copy ${label}`}>
        <Copy size={14} />
      </button>
    </div>
  ) : null;

const PayTo = ({ info, configured, amount }) => {
  if (!info) return null;
  if (!configured) {
    return (
      <div className="panel panel-pad mb-6 !border-gold/50">
        <p className="flex items-start gap-2 text-sm text-gold">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          The admin has not added payment details yet. Please check back soon or contact support.
        </p>
      </div>
    );
  }
  const upiLink = info.upiId
    ? `upi://pay?pa=${encodeURIComponent(info.upiId)}&pn=${encodeURIComponent(info.upiName || "BidBazaar")}&am=${amount > 0 ? amount : ""}&cu=INR&tn=${encodeURIComponent("BidBazaar commission")}`
    : null;
  return (
    <div className="panel panel-pad mb-6">
      <h2 className="text-lg font-bold">Pay the commission to</h2>
      <p className="mb-2 text-sm text-dim">Send the amount below, then upload the screenshot.</p>
      <div className="divide-y divide-ink-600/60">
        <Row label="UPI ID" value={info.upiId} />
        <Row label="Name on UPI" value={info.upiName} />
        <Row label="Account holder" value={info.bankAccountName} />
        <Row label="Account number" value={info.bankAccountNumber} />
        <Row label="IFSC" value={info.ifscCode} />
        <Row label="Bank" value={info.bankName} />
        <Row label="PayPal" value={info.paypalEmail} />
      </div>
      {info.instructions && <p className="mt-3 text-sm text-dim">{info.instructions}</p>}
      {upiLink && amount > 0 && (
        <a href={upiLink} className="btn-primary mt-4 inline-flex md:hidden">Pay ₹{amount} with a UPI app</a>
      )}
    </div>
  );
};

const SubmitCommission = () => {
  const dispatch = useDispatch();
  const { loading, loaded, unpaidCommission, commissionRate, proofs, paymentInfo, paymentConfigured, demo } = useSelector((s) => s.commission);
  const { user } = useSelector((s) => s.user);
  const dueAt = user?.commissionDueAt ? new Date(user.commissionDueAt) : null;
  const overdue = unpaidCommission > 0 && dueAt && dueAt < new Date();
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [proof, setProof] = useState(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    dispatch(getMyCommission());
    dispatch(getPaymentInfo());
  }, [dispatch]);

  useEffect(() => {
    if (loaded && unpaidCommission > 0 && amount === "") setAmount(String(Math.max(0, unpaidCommission - pendingTotal)));
  }, [loaded, unpaidCommission]); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingTotal = proofs.filter((p) => p.status === "Pending" || p.status === "Approved").reduce((sum, p) => sum + p.amount, 0);

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

  const pending = pendingTotal;

  return (
    <Page narrow>
      <PageHeader title="Commission" subtitle={`Sellers pay ${commissionRate * 100}% of each sale to the platform once the buyer has paid.`} />

      {demo && (
        <p className="mb-4 rounded-xl border border-gold/50 bg-gold/10 p-3 text-sm text-gold">
          <strong>Demo project:</strong> the payment details below are dummy. Do not send real money — just upload any sample screenshot to try the flow.
        </p>
      )}

      <div className={`panel panel-pad mb-6 flex items-center justify-between gap-4 ${unpaidCommission > 0 ? "!border-live/50" : "!border-win/40"}`}>
        <div>
          <p className="text-sm text-dim">Currently owed</p>
          <p className={`num font-display text-4xl font-extrabold ${unpaidCommission > 0 ? "text-live" : "text-win"}`}>{formatMoney(unpaidCommission)}</p>
          {unpaidCommission > 0 && dueAt && (
            <p className={`mt-1 text-xs ${overdue ? "font-bold text-live" : "text-dim"}`}>
              {overdue ? "Overdue since " : "Pay by "}{formatDate(dueAt)}{overdue ? " — bidding is paused until you pay." : ""}
            </p>
          )}
          {pending > 0 && <p className="mt-1 text-xs text-dim">{formatMoney(pending)} of payments awaiting review</p>}
        </div>
        {unpaidCommission === 0 && loaded && <span className="badge-win"><CheckCircle2 size={14} /> All settled</span>}
      </div>

      {unpaidCommission > 0 && <PayTo info={paymentInfo} configured={paymentConfigured} amount={Math.max(0, unpaidCommission - pending)} />}

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
                <div className="text-right">
                  <span className={STATUS_CLASS[p.status] || "badge-ended"}>{p.status}</span>
                  {p.status === "Rejected" && p.adminNote && <p className="mt-1 max-w-[220px] text-xs text-live">{p.adminNote}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Page>
  );
};

export default SubmitCommission;
