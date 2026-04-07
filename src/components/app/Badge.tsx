import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

export function AppBadge({
  tone = "neutral",
  children,
  className,
  title,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={className ? `app-badge ${className}` : "app-badge"}
      data-tone={tone}
      title={title}
    >
      {children}
    </span>
  );
}
