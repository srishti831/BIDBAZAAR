import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Gavel, Receipt, Timer, Users, Wallet } from "lucide-react";
import {
  clearAllSuperAdminSliceErrors,
  getAllPaymentProofs,
  getAllUsers,
  getMonthlyRevenue,
  getPlatformStats,
} from "@/store/slices/superAdminSlice";
import { getAllAuctionItems } from "@/store/slices/auctionSlice";
import { formatMoney } from "@/lib/format";
import { Page, PageHeader, Stat } from "@/custom-components/Page";
import AuctionItemDelete from "./sub-components/AuctionItemDelete";
import BiddersAuctioneersGraph from "./sub-components/BiddersAuctioneersGraph";
import PaymentGraph from "./sub-components/PaymentGraph";
import PaymentProofs from "./sub-components/PaymentProofs";
import PaymentSettings from "./sub-components/PaymentSettings";

const Dashboard = () => {
  const dispatch = useDispatch();
  const { stats } = useSelector((s) => s.superAdmin);

  useEffect(() => {
    dispatch(getPlatformStats());
    dispatch(getMonthlyRevenue());
    dispatch(getAllUsers());
    dispatch(getAllPaymentProofs());
    dispatch(getAllAuctionItems({ silent: true }));
    dispatch(clearAllSuperAdminSliceErrors());
  }, [dispatch]);

  return (
    <Page>
      <PageHeader title="Dashboard" subtitle="Platform health, revenue and moderation." />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Members" value={stats?.users ?? "—"} icon={Users} />
        <Stat label="Live auctions" value={stats?.live ?? "—"} tone="text-live" icon={Gavel} />
        <Stat label="Upcoming" value={stats?.upcoming ?? "—"} tone="text-sky" icon={Timer} />
        <Stat label="Proofs to review" value={stats?.pendingProofs ?? "—"} tone="text-gold" icon={Receipt} />
        <Stat label="Commission owed" value={stats ? formatMoney(stats.unpaidCommission) : "—"} tone="text-live" icon={Wallet} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel panel-pad">
          <h2 className="mb-4 text-lg font-bold">Commission received per month</h2>
          <PaymentGraph />
        </section>
        <section className="panel panel-pad">
          <h2 className="mb-4 text-lg font-bold">New members per month</h2>
          <BiddersAuctioneersGraph />
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Where sellers pay you (commission)</h2>
        <PaymentSettings />
      </section>
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Payment proofs</h2>
        <PaymentProofs />
      </section>
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">All auctions</h2>
        <AuctionItemDelete />
      </section>
    </Page>
  );
};

export default Dashboard;
