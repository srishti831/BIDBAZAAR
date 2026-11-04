import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Camera } from "lucide-react";
import { register } from "@/store/slices/userSlice";
import { Page } from "@/custom-components/Page";

const SignUp = () => {
  const [form, setForm] = useState({ userName: "", email: "", phone: "", address: "", password: "" });
  const [profileImage, setProfileImage] = useState(null);
  const [preview, setPreview] = useState("");
  const { loading, isAuthenticated } = useSelector((s) => s.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const imageHandler = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Please choose a PNG, JPG or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }
    setProfileImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!profileImage) return toast.error("Please add a profile photo.");
    if (!/^\d{10}$/.test(form.phone)) return toast.error("Phone number must be exactly 10 digits.");
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters.");
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    formData.append("profileImage", profileImage);
    const ok = await dispatch(register(formData));
    if (ok) navigate(location.state?.from || "/", { replace: true });
  };

  if (isAuthenticated) return <Navigate to={location.state?.from || "/"} replace />;

  return (
    <Page narrow>
      <div className="panel panel-pad">
        <h1 className="text-3xl font-extrabold">Create your account</h1>
        <p className="mt-1 text-sm text-dim">
          One account does it all: bid on anything, and list your own items whenever you like.
        </p>

        <form onSubmit={handleRegister} className="mt-6 space-y-5">
          <div className="flex items-center gap-4">
            <label htmlFor="avatar" className="group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-ink-500 hover:border-bid-soft">
              <img src={preview || "/imageHolder.jpg"} alt="Profile preview" className="h-full w-full object-cover" />
              <span className="absolute inset-0 grid place-items-center bg-ink-950/60 opacity-0 transition group-hover:opacity-100">
                <Camera size={20} />
              </span>
            </label>
            <div>
              <label htmlFor="avatar" className="btn-ghost btn-sm cursor-pointer">Choose photo</label>
              <input id="avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={imageHandler} className="sr-only" />
              <p className="hint">Shown next to your bids. PNG, JPG or WEBP, up to 5 MB.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="userName" className="label">Full name</label>
              <input id="userName" required minLength={3} value={form.userName} onChange={set("userName")} autoComplete="name" className="input" />
            </div>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" type="email" required value={form.email} onChange={set("email")} autoComplete="email" className="input" />
            </div>
            <div>
              <label htmlFor="phone" className="label">Phone (10 digits)</label>
              <input id="phone" inputMode="numeric" required maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} autoComplete="tel-national" className="input" />
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input id="password" type="password" required minLength={8} value={form.password} onChange={set("password")} autoComplete="new-password" className="input" />
              <p className="hint">At least 8 characters.</p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className="label">Address</label>
              <input id="address" required value={form.address} onChange={set("address")} autoComplete="street-address" className="input" />
              <p className="hint">Only shared with a seller if you win their item.</p>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-dim">
          Already registered?{" "}
          <Link to="/login" state={location.state} className="font-semibold text-bid-soft hover:underline">Log in</Link>
        </p>
      </div>
    </Page>
  );
};

export default SignUp;
