import React from "react";
import { Eye, Gavel, Mail, Receipt, RotateCcw, Timer, User, Wallet } from "lucide-react";
import { Page, PageHeader } from "@/custom-components/Page";

const steps = [
  { icon: User, title: "One account for everything", text: "Sign up once. You can bid on other people's items and list your own, with no separate bidder and seller accounts." },
  { icon: Gavel, title: "Bidding", text: "Each auction shows the minimum next bid. Pick a quick-bid amount or type your own, then confirm. You can't bid on your own listing, and you can't outbid yourself." },
  { icon: Timer, title: "Fair closing", text: "If someone bids in the last 2 minutes, the auction is extended by 2 minutes. Countdowns follow the server's clock, not yours." },
  { icon: Mail, title: "Winning", text: "The highest bidder is emailed when the auction ends, and sees the seller's contact and payment details under My bids. The seller gets the winner's contact details too." },
  { icon: Wallet, title: "Selling", text: "Add payout details (bank, UPI or PayPal) once, the first time you list an item. Details are only shared with the winner." },
  { icon: Receipt, title: "Commission", text: "After the buyer pays you, pay the platform 5% and upload a screenshot on the Commission page. An admin verifies it. Unpaid commission pauses new listings." },
  { icon: RotateCcw, title: "If the winner doesn't pay", text: "Republish the item from My listings at no cost. The failed sale and its commission are cleared." },
  { icon: Eye, title: "Watchlist", text: "Tap the heart on any auction to save it, so you can return before it starts or ends." },
];

const HowItWorks = () => (
  <Page narrow>
    <PageHeader title="How BidBazaar works" subtitle="Everything you need to bid, sell and get paid." />
    <div className="grid gap-4 sm:grid-cols-2">
      {steps.map(({ icon: Icon, title, text }) => (
        <div key={title} className="panel panel-pad">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-bid/15 text-bid-soft"><Icon size={20} /></span>
          <h2 className="mt-3 text-lg font-bold">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-dim">{text}</p>
        </div>
      ))}
    </div>
  </Page>
);

export default HowItWorks;
