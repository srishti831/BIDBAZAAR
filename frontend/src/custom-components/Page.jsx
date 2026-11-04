import React from "react";
import { Link } from "react-router-dom";

export const Page = ({ children, className = "", narrow = false }) => (
  <main
    className={`mx-auto w-full ${narrow ? "max-w-3xl" : "max-w-7xl"} px-4 py-8 sm:px-6 lg:py-10 ${className}`}
  >
    {children}
  </main>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-dim">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const EmptyState = ({ icon: Icon, title, text, actionLabel, actionTo, children }) => (
  <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
    {Icon && (
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-bid/15 text-bid-soft">
        <Icon size={26} />
      </span>
    )}
    <h3 className="text-xl font-bold">{title}</h3>
    {text && <p className="max-w-md text-dim">{text}</p>}
    {actionLabel && actionTo && (
      <Link to={actionTo} className="btn-primary mt-2">
        {actionLabel}
      </Link>
    )}
    {children}
  </div>
);

export const CardSkeletons = ({ count = 8 }) => (
  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="panel overflow-hidden">
        <div className="skeleton aspect-[4/3] w-full rounded-none" />
        <div className="space-y-3 p-4">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-6 w-1/2" />
          <div className="skeleton h-4 w-full" />
        </div>
      </div>
    ))}
  </div>
);

export const Stat = ({ label, value, tone = "text-fg", icon: Icon }) => (
  <div className="panel flex items-center gap-4 p-4">
    {Icon && (
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink-600/80 text-bid-soft">
        <Icon size={20} />
      </span>
    )}
    <div className="min-w-0">
      <p className="text-xs font-semibold text-dim">{label}</p>
      <p className={`num truncate font-display text-2xl font-extrabold ${tone}`}>{value}</p>
    </div>
  </div>
);
