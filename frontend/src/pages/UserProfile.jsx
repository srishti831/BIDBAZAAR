import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Camera, CheckCircle2, Heart, Trophy, Wallet } from "lucide-react";
import { changePassword, updateProfile } from "@/store/slices/userSlice";
import { formatDate, formatMoney } from "@/lib/format";
import { Page, PageHeader, Stat } from "@/custom-components/Page";
import PayoutForm from "@/custom-components/PayoutForm";

const UserProfile = () => {
  const dispatch = useDispatch();
  const { user, saving } = useSelector((s) => s.user);
  const isMember = user.role === "User";

  const [form, setForm] = useState({ userName: user.userName || "", phone: user.phone || "", address: user.address || "" });
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState("");
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const pickAvatar = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return toast.error("Please choose a PNG, JPG or WEBP image.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be smaller than 5 MB.");
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(form.phone)) return toast.error("Phone number must be exactly 10 digits.");
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    if (avatar) data.append("profileImage", avatar);
    const ok = await dispatch(updateProfile(data));
    if (ok) setAvatar(null);
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword.length < 8) return toast.error("New password must be at least 8 characters.");
    if (pw.newPassword !== pw.confirm) return toast.error("The new passwords don't match.");
    const ok = await dispatch(changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword }));
    if (ok) setPw({ currentPassword: "", newPassword: "", confirm: "" });
  };

  return (
    <Page>
      <PageHeader title="Profile" subtitle={`${user.email} · member since ${formatDate(user.createdAt)}`} />

      {isMember && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Auctions won" value={user.auctionsWon || 0} icon={Trophy} />
          <Stat label="Total spent" value={formatMoney(user.moneySpent)} tone="text-gold" icon={Wallet} />
          <Stat label="Watching" value={user.watchlist?.length || 0} icon={Heart} />
          <Stat label="Commission owed" value={formatMoney(user.unpaidCommission)} tone={user.unpaidCommission > 0 ? "text-live" : "text-win"} icon={Wallet} />
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="panel panel-pad space-y-4">
          <h2 className="text-lg font-bold">Personal details</h2>
          <div className="flex items-center gap-4">
            <label htmlFor="avatar" className="group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-2xl">
              <img src={preview || user.profileImage?.url || "/imageHolder.jpg"} alt="Your profile" className="h-full w-full object-cover" />
              <span className="absolute inset-0 grid place-items-center bg-ink-950/60 opacity-0 transition group-hover:opacity-100"><Camera size={20} /></span>
            </label>
            <input id="avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={pickAvatar} className="sr-only" />
            <p className="text-sm text-dim">Click your photo to change it.</p>
          </div>
          <div>
            <label htmlFor="userName" className="label">Name</label>
            <input id="userName" required minLength={3} value={form.userName} onChange={set("userName")} className="input" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Email</label>
              <input value={user.email || ""} disabled className="input" />
            </div>
            <div>
              <label htmlFor="phone" className="label">Phone</label>
              <input id="phone" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} className="input" />
            </div>
          </div>
          <div>
            <label htmlFor="address" className="label">Address</label>
            <input id="address" required value={form.address} onChange={set("address")} className="input" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save changes"}</button>
        </form>

        <div className="space-y-6">
          {isMember && (
            <div className="panel panel-pad">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Payout details</h2>
                  <p className="text-sm text-dim">Only needed if you sell. Skip this if you just bid.</p>
                </div>
                {user.payoutReady ? (
                  <span className="badge-win shrink-0"><CheckCircle2 size={13} /> Ready to sell</span>
                ) : (
                  <span className="badge-gold shrink-0">Not set</span>
                )}
              </div>
              <PayoutForm />
            </div>
          )}

          <form onSubmit={savePassword} className="panel panel-pad space-y-4">
            <h2 className="text-lg font-bold">Change password</h2>
            <div>
              <label htmlFor="cur" className="label">Current password</label>
              <input id="cur" type="password" autoComplete="current-password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} className="input" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="new" className="label">New password</label>
                <input id="new" type="password" autoComplete="new-password" required minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} className="input" />
              </div>
              <div>
                <label htmlFor="conf" className="label">Confirm new password</label>
                <input id="conf" type="password" autoComplete="new-password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} className="input" />
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-ghost">Update password</button>
          </form>
        </div>
      </div>
      {isMember && user.unpaidCommission > 0 && (
        <p className="mt-6 text-sm text-dim">
          You owe platform commission. <Link to="/submit-commission" className="font-semibold text-bid-soft hover:underline">Pay it here</Link>.
        </p>
      )}
    </Page>
  );
};

export default UserProfile;
