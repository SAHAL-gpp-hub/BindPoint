import React from "react";

interface StatusBadgeProps {
  status: string;
  type?: "payment" | "print";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.trim().toLowerCase();

  let badgeClasses = "bg-surface-subtle text-ink-secondary border-line";
  let dotColor = "bg-ink-muted";

  if (normalized.includes("successful") || normalized.includes("confirmed") || normalized.includes("ready")) {
    badgeClasses = "bg-emerald-50/90 text-emerald-800 border-emerald-200/90 font-medium";
    dotColor = "bg-emerald-500";
  } else if (normalized.includes("verification required")) {
    badgeClasses = "bg-amber-50 text-amber-900 border-amber-300/80 font-medium";
    dotColor = "bg-amber-500 animate-pulse";
  } else if (normalized.includes("pending") || normalized.includes("submitted")) {
    badgeClasses = "bg-amber-50/70 text-amber-800 border-amber-200/80";
    dotColor = "bg-amber-400";
  } else if (normalized.includes("printing")) {
    badgeClasses = "bg-blue-50 text-blue-800 border-blue-200 font-medium";
    dotColor = "bg-blue-500 animate-ping";
  } else if (normalized.includes("completed")) {
    badgeClasses = "bg-teal-50 text-teal-900 border-teal-200 font-semibold";
    dotColor = "bg-teal-600";
  } else if (normalized.includes("failed") || normalized.includes("rejected") || normalized.includes("cancelled")) {
    badgeClasses = "bg-rose-50 text-rose-800 border-rose-200";
    dotColor = "bg-rose-500";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono tracking-tight border shadow-xs ${badgeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{status}</span>
    </span>
  );
};
