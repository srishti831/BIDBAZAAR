import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Copy, Crown, Gavel, Trophy } from "lucide-react";
import { getMyBids } from "@/store/slices/bidSlice";
import { useNow } from "@/hooks/useNow";
import { formatMoney } from "@/lib/format";
import { Page, PageHeader, EmptyState, Stat } from "@/custom-components/Page";
import Countdown from "@/custom-components/Countdown";

const STANDING = {
  leading: { label: "Leading", cls: "badge-win" },
  outbid: { label: "Outbid", cls: "badge-live" },
  won: { label: "Won", cls: "badge-win" },
  lost: { label: "Lost", cls: "badge-ended" },
};

const TABS = [
  ["all", "All"],
  ["active", "Active"],
  ["won", "Won"],
  ["lost", "Lost"],
];

const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied.");
  } catch {
    toast.info(text);
  }
};

const Row = ({ label, value }) =>
  value ? (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-dim">{label}</span>
      <button type="button" onClick={() => copy(value)} className="flex items-center gap-1.5 font-semibold hover:text-bid-soft" title="Copy">
        <span className="break-all text-right">{value}</span> <Copy size={13} className="shrink-0" />
      </button>
    </div>
  ) : null;

const BidRow = ({ item }) => {
  const s = STANDING[item.standing];
  const pm = item.seller?.paymentMethods || {};
  const bank = pm.bankTransfer || {};
  return (
    <div className="panel p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Link to={`/auction/item/${item._id}`} className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-950">
          <img src={item.image?.url} alt="" className="h-full w-full object-contain p-1.5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={s.cls}>{item.standing === "won" && <Trophy size={12} />}{item.standing === "leading" && <Crown size={12} />}{s.label}</span>
          </div>
          <Link to={`/auction/item/${item._id}`} className="mt-1 block truncate text-lg font-bold hover:text-bid-soft">{item.title}</Link>
          <p className="text-sm text-dim">
            Your bid <span className="num font-bold text-fg">{formatMoney(item.myBid)}</span>
            {item.standing !== "won" && (
              <> · {item.standing === "lost" ? "Final" : "Current"} <span className="num font-bold text-gold">{formatMoney(item.currentBid)}</span></>
            )}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          {item.standing === "leading" || item.standing === "outbid" ? (
            <p className="text-sm text-dim">Ends in <Countdown to={item.endTime} className="font-bold" /></p>
          ) : null}
          {item.standing === "outbid" && (
            <Link to={`/auction/item/${item._id}`} className="btn-primary btn-sm"><Gavel size={14} /> Bid again</Link>
          )}
          {item.standing === "leading" && <Link to={`/auction/item/${item._id}`} className="btn-ghost btn-sm">View</Link>}
        </div>
      </div>

      {item.standing === "won" && item.seller && (
        <div className="mt-4 space-y-2 rounded-xl border border-win/30 bg-win/5 p-4">
          <p className="font-bold text-win">You won! Pay {item.seller.userName} {formatMoney(item.currentBid)}</p>
          <p className="text-xs text-dim">Contact the seller before paying. Tap a detail to copy it.</p>
          <Row label="Seller email" value={item.seller.email} />
          <Row label="Seller phone" value={item.seller.phone} />
          <Row label="UPI" value={pm.upi?.upiId} />
          <Row label="Bank" value={bank.bankName} />
          <Row label="Account holder" value={bank.bankAccountName} />
          <Row label="Account number" value={bank.bankAccountNumber} />
          <Row label="IFSC" value={bank.ifscCode} />
          <Row label="PayPal" value={pm.paypal?.paypalEmail} />
        </div>
      )}
    </div>
  );
};

const MyBids = () => {
  const dispatch = useDispatch();
  const { myBids, myBidsLoaded } = useSelector((s) => s.bid);
  const { user } = useSelector((s) => s.user);
  const [tab, setTab] = useState("all");
  const now = useNow();
  const tick = Math.floor(now / 15000);

  useEffect(() => {
    dispatch(getMyBids());
    const timer = setInterval(() => !document.hidden && dispatch(getMyBids()), 15000);
    return () => clearInterval(timer);
  }, [dispatch]);

  const shown = useMemo(() => {
    const filters = {
      all: () => true,
      active: (b) => b.standing === "leading" || b.standing === "outbid",
      won: (b) => b.standing === "won",
      lost: (b) => b.standing === "lost",
    };
    return myBids.filter(filters[tab]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myBids, tab, tick]);

  const leading = myBids.filter((b) => b.standing === "leading").length;
  const outbid = myBids.filter((b) => b.standing === "outbid").length;

  return (
    <Page>
      <PageHeader title="My bids" subtitle="Where you stand in every auction you've bid on." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Leading" value={leading} tone="text-win" icon={Crown} />
        <Stat label="Outbid" value={outbid} tone="text-live" icon={Gavel} />
        <Stat label="Auctions won" value={user.auctionsWon || 0} icon={Trophy} />
        <Stat label="Total spent" value={formatMoney(user.moneySpent)} tone="text-gold" icon={Gavel} />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id} className={`chip ${tab === id ? "chip-on" : ""}`}>{label}</button>
        ))}
      </div>

      {!myBidsLoaded ? (
        <div className="skeleton h-32 w-full" />
      ) : shown.length === 0 ? (
        <EmptyState icon={Gavel} title="No bids here yet" text="Find something you like and place your first bid." actionLabel="Browse live auctions" actionTo="/auctions?status=live" />
      ) : (
        <div className="space-y-4">{shown.map((b) => <BidRow key={b._id} item={b} />)}</div>
      )}
    </Page>
  );
};

export default MyBids;
