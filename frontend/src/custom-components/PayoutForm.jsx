import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updatePayout } from "@/store/slices/userSlice";
import { INDIAN_BANKS } from "@/lib/format";

// Only sellers need this. It is asked for on the Sell page (and editable in the
// profile) instead of on sign-up, so people who only bid never see it.
const PayoutForm = ({ onSaved, submitLabel = "Save payout details" }) => {
  const dispatch = useDispatch();
  const { user, saving } = useSelector((s) => s.user);
  const pm = user.paymentMethods || {};
  const [form, setForm] = useState({
    bankName: pm.bankTransfer?.bankName || "",
    bankAccountName: pm.bankTransfer?.bankAccountName || "",
    bankAccountNumber: pm.bankTransfer?.bankAccountNumber || "",
    ifscCode: pm.bankTransfer?.ifscCode || "",
    upiId: pm.upi?.upiId || "",
    paypalEmail: pm.paypal?.paypalEmail || "",
  });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const ok = await dispatch(updatePayout(form));
    if (ok && onSaved) onSaved();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-sm text-dim">
        Add at least one way to get paid. These details are emailed only to the winner of
        your auctions.
      </p>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-bold">Bank transfer</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <select value={form.bankName} onChange={set("bankName")} className="input" aria-label="Bank">
            <option value="">Select your bank</option>
            {INDIAN_BANKS.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
          <input value={form.bankAccountName} onChange={set("bankAccountName")} placeholder="Account holder name" className="input" />
          <input value={form.bankAccountNumber} onChange={set("bankAccountNumber")} placeholder="Account number" inputMode="numeric" className="input" />
          <input value={form.ifscCode} onChange={set("ifscCode")} placeholder="IFSC code" className="input uppercase" />
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold">UPI</label>
          <input value={form.upiId} onChange={set("upiId")} placeholder="name@bank" className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold">PayPal</label>
          <input type="email" value={form.paypalEmail} onChange={set("paypalEmail")} placeholder="PayPal email" className="input" />
        </div>
      </div>

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
};

export default PayoutForm;
