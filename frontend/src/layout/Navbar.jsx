import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronDown,
  Eye,
  Gavel,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Receipt,
  Trophy,
  User,
  Wallet,
  X,
} from "lucide-react";
import { logout } from "@/store/slices/userSlice";
import { formatMoney } from "@/lib/format";

export const Logo = ({ size = "md" }) => (
  <span className="flex items-center gap-2.5">
    <span
      className={`grid place-items-center rounded-xl bg-gradient-to-br from-bid to-live text-white shadow-lg shadow-bid/30 ${
        size === "lg" ? "h-11 w-11" : "h-9 w-9"
      }`}
    >
      <Gavel size={size === "lg" ? 22 : 18} />
    </span>
    <span className={`font-display font-extrabold tracking-tight ${size === "lg" ? "text-2xl" : "text-xl"}`}>
      BidBazaar
    </span>
  </span>
);

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive ? "bg-ink-600 text-fg" : "text-dim hover:bg-ink-700 hover:text-fg"
  }`;

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useSelector((s) => s.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  const isMember = isAuthenticated && user?.role === "User";
  const isAdmin = isAuthenticated && user?.role === "Super Admin";
  const owes = Number(user?.unpaidCommission) > 0;

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate("/");
  };

  const memberLinks = [
    { to: "/my-bids", label: "My bids", icon: Gavel },
    { to: "/watchlist", label: "Watchlist", icon: Heart },
    { to: "/view-my-auctions", label: "My listings", icon: Eye },
    { to: "/submit-commission", label: "Commission", icon: Receipt, alert: owes },
    { to: "/me", label: "Profile & payouts", icon: User },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-ink-600/70 bg-ink-900/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="BidBazaar home">
          <Logo />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main">
          <NavLink to="/auctions" className={linkClass}>Auctions</NavLink>
          <NavLink to="/leaderboard" className={linkClass}>Leaderboard</NavLink>
          <NavLink to="/how-it-works-info" className={linkClass}>How it works</NavLink>
          {isAdmin && <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isMember && (
            <Link to="/create-auction" className="btn-primary btn-sm hidden sm:inline-flex">
              <Plus size={16} /> Sell an item
            </Link>
          )}

          {!isAuthenticated ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="btn-ghost btn-sm">Log in</Link>
              <Link to="/sign-up" className="btn-primary btn-sm">Sign up</Link>
            </div>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-xl border border-ink-500 bg-ink-700/70 py-1 pl-1 pr-2.5 hover:border-bid-soft"
              >
                <span className="relative">
                  <img
                    src={user.profileImage?.url || "/imageHolder.jpg"}
                    alt=""
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                  {owes && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-ink-800 bg-live" />}
                </span>
                <span className="hidden max-w-[110px] truncate text-sm font-semibold sm:block">{user.userName}</span>
                <ChevronDown size={15} className="text-dim" />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="panel rise absolute right-0 mt-2 w-64 overflow-hidden bg-ink-800 p-1.5 shadow-2xl"
                >
                  <div className="border-b border-ink-600/70 px-3 py-2.5">
                    <p className="truncate text-sm font-bold">{user.userName}</p>
                    <p className="truncate text-xs text-dim">{user.email}</p>
                  </div>
                  {isMember &&
                    memberLinks.map(({ to, label, icon: Icon, alert }) => (
                      <Link
                        key={to}
                        to={to}
                        role="menuitem"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-dim hover:bg-ink-600 hover:text-fg"
                      >
                        <Icon size={17} /> {label}
                        {alert && (
                          <span className="ml-auto rounded-full bg-live/15 px-2 py-0.5 text-[11px] font-bold text-live">
                            Owe {formatMoney(user.unpaidCommission)}
                          </span>
                        )}
                      </Link>
                    ))}
                  {isAdmin && (
                    <>
                      <Link to="/dashboard" role="menuitem" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-dim hover:bg-ink-600 hover:text-fg">
                        <LayoutDashboard size={17} /> Dashboard
                      </Link>
                      <Link to="/me" role="menuitem" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-dim hover:bg-ink-600 hover:text-fg">
                        <User size={17} /> Profile
                      </Link>
                    </>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-3 rounded-lg border-t border-ink-600/70 px-3 py-2.5 text-sm font-semibold text-live hover:bg-live/10"
                  >
                    <LogOut size={17} /> Log out
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-ink-500 bg-ink-700/70 lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="rise border-t border-ink-600/70 bg-ink-900 px-4 py-3 lg:hidden" aria-label="Mobile">
          <div className="grid gap-1">
            <NavLink to="/auctions" className={linkClass}>Auctions</NavLink>
            <NavLink to="/leaderboard" className={linkClass}>Leaderboard</NavLink>
            <NavLink to="/how-it-works-info" className={linkClass}>How it works</NavLink>
            {isMember && (
              <>
                <NavLink to="/create-auction" className={linkClass}>Sell an item</NavLink>
                <NavLink to="/my-bids" className={linkClass}>My bids</NavLink>
                <NavLink to="/watchlist" className={linkClass}>Watchlist</NavLink>
                <NavLink to="/view-my-auctions" className={linkClass}>My listings</NavLink>
                <NavLink to="/submit-commission" className={linkClass}>Commission</NavLink>
              </>
            )}
            {isAdmin && <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>}
            {isAuthenticated && <NavLink to="/me" className={linkClass}>Profile</NavLink>}
            {!isAuthenticated && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/login" className="btn-ghost">Log in</Link>
                <Link to="/sign-up" className="btn-primary">Sign up</Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
