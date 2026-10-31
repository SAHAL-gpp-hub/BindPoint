import React from "react";

interface StatusBadgeProps {
  status: string;
  type?: "payment" | "print";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.trim().toLowerCase();

  let styles = "bg-surface-subtle text-ink-secondary border-line";

  if (normalized.includes("successful") || normalized.includes("confirmed") || normalized.includes("ready")) {
    styles = "bg-emerald-50 text-emerald-800 border-emerald-200";
  } else if (normalized.includes("verification required")) {
    styles = "bg-amber-50 text-amber-900 border-amber-300 font-medium";
  } else if (normalized.includes("pending") || normalized.includes("submitted")) {
    styles = "bg-amber-50/60 text-amber-800 border-amber-200";
  } else if (normalized.includes("printing")) {
    styles = "bg-blue-50 text-blue-800 border-blue-200 animate-pulse";
  } else if (normalized.includes("completed")) {
    styles = "bg-teal-50 text-teal-900 border-teal-200 font-medium";
  } else if (normalized.includes("failed") || normalized.includes("rejected") || normalized.includes("cancelled")) {
    styles = "bg-red-50 text-red-800 border-red-200";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono tracking-tight border uppercase ${styles}`}
    >
      {status}
    </span>
  );
};
