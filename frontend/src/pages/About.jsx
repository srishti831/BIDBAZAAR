import React from "react";
import { Link } from "react-router-dom";
import { Page, PageHeader } from "@/custom-components/Page";

const values = [
  ["Integrity", "Every bid is recorded with a time, prices come from the server, and sellers can't bid on their own items."],
  ["Clarity", "You always see the minimum next bid, the closing time and where you stand."],
  ["Community", "Buyers and sellers share one account and one marketplace."],
  ["Support", "Questions? Reach us any time from the contact page."],
];

const About = () => (
  <Page narrow>
    <PageHeader title="About BidBazaar" subtitle="An online auction house built around fair, transparent bidding." />
    <div className="space-y-8 text-dim">
      <p className="leading-relaxed">
        BidBazaar connects people who want to find something special with people who have something to sell. Our goal is simple: make competitive bidding exciting, and keep it honest.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {values.map(([title, text]) => (
          <div key={title} className="panel panel-pad">
            <h2 className="text-lg font-bold text-fg">{title}</h2>
            <p className="mt-1 text-sm">{text}</p>
          </div>
        ))}
      </div>
      <p>
        Ready to start? <Link to="/auctions?status=live" className="font-semibold text-bid-soft hover:underline">See what's live</Link> or{" "}
        <Link to="/contact" className="font-semibold text-bid-soft hover:underline">get in touch</Link>.
      </p>
    </div>
  </Page>
);

export default About;
