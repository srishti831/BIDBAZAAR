import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { login } from "@/store/slices/userSlice";
import { Page } from "@/custom-components/Page";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { loading, isAuthenticated } = useSelector((s) => s.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    const ok = await dispatch(login({ email, password }));
    if (ok) navigate(location.state?.from || "/", { replace: true });
  };

  if (isAuthenticated) return <Navigate to={location.state?.from || "/"} replace />;

  return (
    <Page narrow className="grid min-h-[70vh] place-items-center">
      <div className="panel panel-pad w-full max-w-md">
        <h1 className="text-3xl font-extrabold">Welcome back</h1>
        <p className="mt-1 text-sm text-dim">Log in to bid, sell and track your auctions.</p>
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-dim">
          New here?{" "}
          <Link to="/sign-up" state={location.state} className="font-semibold text-bid-soft hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </Page>
  );
};

export default Login;
