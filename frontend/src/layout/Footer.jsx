import React from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Navbar";

const Footer = () => (
  <footer className="mt-16 border-t border-ink-600/70 bg-ink-950/60">
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <Logo />
        <p className="max-w-xs text-sm text-dim">
          Fair, transparent auctions. Every bid is timestamped and last-second sniping is blocked.
        </p>
      </div>
      <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-dim" aria-label="Footer">
        <Link to="/auctions" className="hover:text-fg">Auctions</Link>
        <Link to="/leaderboard" className="hover:text-fg">Leaderboard</Link>
        <Link to="/how-it-works-info" className="hover:text-fg">How it works</Link>
        <Link to="/about" className="hover:text-fg">About</Link>
        <Link to="/contact" className="hover:text-fg">Contact</Link>
      </nav>
    </div>
    <p className="border-t border-ink-600/50 py-4 text-center text-xs text-faint">
      © {new Date().getFullYear()} BidBazaar
    </p>
  </footer>
);

export default Footer;
