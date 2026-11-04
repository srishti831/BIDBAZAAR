import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { AlertTriangle, CheckCircle2, ImagePlus, Wallet } from "lucide-react";
import { createAuction } from "@/store/slices/auctionSlice";
import { AUCTION_CATEGORIES, formatMoney } from "@/lib/format";
import { Page, PageHeader } from "@/custom-components/Page";
import PayoutForm from "@/custom-components/PayoutForm";
import SchedulePicker, { scheduleToPayload, validateSchedule } from "@/custom-components/SchedulePicker";

const CreateAuction = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.user);
  const { loading } = useSelector((s) => s.auction);

  const [form, setForm] = useState({ title: "", category: "", condition: "", startingBid: "", description: "" });
  const [schedule, setSchedule] = useState({ startNow: true, start: null, end: null });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const owes = Number(user.unpaidCommission) > 0;

  const imageHandler = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return toast.error("Please choose a PNG, JPG or WEBP image.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be smaller than 5 MB.");
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!image) return toast.error("Please upload a photo of the item.");
    if (!(Number(form.startingBid) > 0)) return toast.error("Enter a starting bid above zero.");
    const problem = validateSchedule(schedule);
    if (problem) return toast.error(problem);

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v.trim ? v.trim() : v));
    data.append("image", image);
    const payload = scheduleToPayload(schedule);
    data.append("startNow", payload.startNow);
    if (payload.startTime) data.append("startTime", payload.startTime);
    data.append("endTime", payload.endTime);

    const created = await dispatch(createAuction(data));
    if (created) navigate(`/auction/item/${created._id}`);
  };

  return (
    <Page narrow>
      <PageHeader title="Sell an item" subtitle="List it once, and the highest bidder pays you directly." />

      {owes && (
        <div className="panel mb-6 flex flex-col gap-3 !border-live/50 bg-live/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm text-live">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            You owe {formatMoney(user.unpaidCommission)} in platform commission. New listings are paused until it's paid.
          </p>
          <Link to="/submit-commission" className="btn-live btn-sm">Pay commission</Link>
        </div>
      )}

      {!user.payoutReady ? (
        <div className="panel panel-pad">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold/15 text-gold"><Wallet size={20} /></span>
            <div>
              <h2 className="text-xl font-bold">One quick step before your first listing</h2>
              <p className="text-sm text-dim">Tell us where winners should send payment.</p>
            </div>
          </div>
          <PayoutForm submitLabel="Save and continue" />
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <div className="panel panel-pad space-y-4">
            <h2 className="text-lg font-bold">Item details</h2>
            <div>
              <label htmlFor="title" className="label">Title</label>
              <input id="title" required maxLength={120} value={form.title} onChange={set("title")} placeholder="e.g. Vintage Omega Seamaster, 1968" className="input" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="category" className="label">Category</label>
                <select id="category" required value={form.category} onChange={set("category")} className="input">
                  <option value="">Select…</option>
                  {AUCTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="condition" className="label">Condition</label>
                <select id="condition" required value={form.condition} onChange={set("condition")} className="input">
                  <option value="">Select…</option>
                  <option value="New">New</option>
                  <option value="Used">Used</option>
                </select>
              </div>
              <div>
                <label htmlFor="startingBid" className="label">Starting bid (₹)</label>
                <input id="startingBid" type="number" required min="1" step="any" value={form.startingBid} onChange={set("startingBid")} className="input num" />
              </div>
            </div>
            <div>
              <label htmlFor="description" className="label">Description</label>
              <textarea id="description" required rows={7} maxLength={3000} value={form.description} onChange={set("description")} placeholder="Condition, age, what's included, any flaws…" className="input" />
              <p className="hint">{form.description.length}/3000</p>
            </div>
          </div>

          <div className="panel panel-pad">
            <h2 className="mb-4 text-lg font-bold">Photo</h2>
            <label htmlFor="photo" className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-500 bg-ink-900/50 p-4 text-center transition hover:border-bid-soft">
              {preview ? (
                <img src={preview} alt="Preview" className="max-h-64 rounded-xl object-contain" />
              ) : (
                <>
                  <ImagePlus size={30} className="text-bid-soft" />
                  <span className="font-semibold">Click to upload a photo</span>
                  <span className="text-xs text-faint">PNG, JPG or WEBP, up to 5 MB</span>
                </>
              )}
            </label>
            <input id="photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={imageHandler} className="sr-only" />
            {preview && <p className="hint">Click the image to change it.</p>}
          </div>

          <div className="panel panel-pad">
            <h2 className="mb-4 text-lg font-bold">Schedule</h2>
            <SchedulePicker value={schedule} onChange={setSchedule} />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm text-dim">
              <CheckCircle2 size={16} className="text-win" /> Payouts to your saved details. <Link to="/me" className="font-semibold text-bid-soft hover:underline">Edit</Link>
            </p>
            <button type="submit" disabled={loading || owes} className="btn-primary btn-lg">
              {loading ? "Publishing…" : schedule.startNow ? "Publish auction" : "Schedule auction"}
            </button>
          </div>
        </form>
      )}
    </Page>
  );
};

export default CreateAuction;
