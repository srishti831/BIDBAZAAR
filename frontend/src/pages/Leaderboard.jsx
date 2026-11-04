import React from "react";
import { useSelector } from "react-redux";
import { Trophy } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { Page, PageHeader, EmptyState } from "@/custom-components/Page";

const PODIUM = [
  { ring: "border-gold", text: "text-gold", label: "1st" },
  { ring: "border-sky", text: "text-sky", label: "2nd" },
  { ring: "border-live", text: "text-live", label: "3rd" },
];

const Leaderboard = () => {
  const { leaderboard, leaderboardLoaded } = useSelector((s) => s.user);
  const top = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <Page narrow>
      <PageHeader title="Leaderboard" subtitle="Top bidders by total spent on auctions won." />
      {!leaderboardLoaded ? (
        <div className="skeleton h-64 w-full" />
      ) : leaderboard.length === 0 ? (
        <EmptyState icon={Trophy} title="No winners yet" text="Win an auction to claim the first spot." actionLabel="Browse live auctions" actionTo="/auctions?status=live" />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {top.map((u, i) => (
              <div key={u._id} className={`panel panel-pad flex flex-col items-center text-center ${i === 0 ? "sm:order-2 sm:-mt-3" : i === 1 ? "sm:order-1" : "sm:order-3"}`}>
                <img src={u.profileImage?.url || "/imageHolder.jpg"} alt="" className={`h-20 w-20 rounded-2xl border-2 object-cover ${PODIUM[i].ring}`} />
                <p className={`mt-3 font-display text-sm font-extrabold ${PODIUM[i].text}`}>{PODIUM[i].label}</p>
                <p className="max-w-full truncate font-bold">{u.userName}</p>
                <p className="num mt-1 font-display text-2xl font-extrabold text-gold">{formatMoney(u.moneySpent)}</p>
                <p className="text-xs text-dim">{u.auctionsWon} won</p>
              </div>
            ))}
          </div>
          {rest.length > 0 && (
            <ol className="panel divide-y divide-ink-600/60">
              {rest.map((u, i) => (
                <li key={u._id} className="flex items-center gap-4 px-5 py-3">
                  <span className="num w-7 text-center font-display font-extrabold text-faint">{i + 4}</span>
                  <img src={u.profileImage?.url || "/imageHolder.jpg"} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <span className="flex-1 truncate font-semibold">{u.userName}</span>
                  <span className="hidden text-sm text-dim sm:block">{u.auctionsWon} won</span>
                  <span className="num font-bold text-gold">{formatMoney(u.moneySpent)}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </Page>
  );
};

export default Leaderboard;
