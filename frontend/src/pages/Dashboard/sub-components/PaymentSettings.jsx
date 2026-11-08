import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AlertTriangle } from "lucide-react";
import { getPaymentSettings, savePaymentSettings } from "@/store/slices/superAdminSlice";

const EMPTY = {
  upiId: "",
  upiName: "",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  ifscCode: "",
  paypalEmail: "",
  instructions: "",
};

// The admin enters here where sellers must send the 5% platform commission.
// Sellers see exactly these details on their Commission page.
const PaymentSettings = () => {
  const dispatch = useDispatch();
  const { paymentSettings, paymentConfigured, savingSettings } = useSelector((s) => s.superAdmin);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    dispatch(getPaymentSettings());
  }, [dispatch]);

  useEffect(() => {
    if (paymentSettings) setForm({ ...EMPTY, ...paymentSettings });
  }, [paymentSettings]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    dispatch(savePaymentSettings(form));
  };

  const field = (key, label, props = {}) => (
    <div>
      <label htmlFor={`ps-${key}`} className="label">{label}</label>
      <input id={`ps-${key}`} value={form[key]} onChange={set(key)} className="input" {...props} />
    </div>
  );

  return (
    <form onSubmit={submit} className="panel panel-pad space-y-5">
      {!paymentConfigured && (
        <p className="flex items-start gap-2 rounded-xl border border-live/40 bg-live/10 p-3 text-sm text-live">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          Sellers cannot see where to pay yet. Add at least one payment method below.
        </p>
      )}
      <p className="text-sm text-dim">
        Sellers pay their 5% commission to these details, then upload a screenshot. You approve it in
        “Payment proofs” below.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("upiId", "UPI ID", { placeholder: "name@bank" })}
        {field("upiName", "Name on UPI", { placeholder: "Shown to sellers" })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("bankName", "Bank name")}
        {field("bankAccountName", "Account holder")}
        {field("bankAccountNumber", "Account number", { inputMode: "numeric" })}
        {field("ifscCode", "IFSC code")}
      </div>
      {field("paypalEmail", "PayPal email (optional)", { type: "email" })}
      <div>
        <label htmlFor="ps-instructions" className="label">Extra instructions (optional)</label>
        <textarea id="ps-instructions" rows={2} maxLength={500} value={form.instructions} onChange={set("instructions")} className="input" placeholder="e.g. Write your registered email in the payment note" />
      </div>
      <button type="submit" disabled={savingSettings} className="btn-primary">
        {savingSettings ? "Saving…" : "Save payment details"}
      </button>
    </form>
  );
};

export default PaymentSettings;
