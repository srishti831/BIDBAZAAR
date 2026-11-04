import React from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { deleteAuctionItem } from "@/store/slices/superAdminSlice";
import { useNow } from "@/hooks/useNow";
import { getStatus } from "@/lib/format";
import StatusBadge from "@/custom-components/StatusBadge";

const AuctionItemDelete = () => {
  const { allAuctions } = useSelector((s) => s.auction);
  const dispatch = useDispatch();
  const now = useNow();

  const remove = (auction) => {
    if (window.confirm(`Delete “${auction.title}” permanently?`)) dispatch(deleteAuctionItem(auction._id));
  };

  return (
    <div className="panel overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-xs text-dim">
          <tr className="border-b border-ink-600/70">
            <th className="px-4 py-3">Item</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-600/50">
          {allAuctions.length === 0 ? (
            <tr><td colSpan={3} className="px-4 py-6 text-center text-dim">No auctions found.</td></tr>
          ) : (
            allAuctions.map((a) => (
              <tr key={a._id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={a.image?.url} alt="" className="h-10 w-10 rounded-lg bg-ink-950 object-contain" />
                    <span className="font-semibold">{a.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={getStatus(a, now)} sold={a.currentBid > 0} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link to={`/auction/item/${a._id}`} className="btn-ghost btn-sm">View</Link>
                    <button type="button" onClick={() => remove(a)} className="btn-danger btn-sm">Delete</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AuctionItemDelete;
