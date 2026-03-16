"use client";

import { type ComponentProps, type ReactNode } from "react";
import { CircleCheck, CircleX, Info, Lightbulb, TriangleAlert } from "lucide-react";

type CalloutType = "info" | "warn" | "warning" | "error" | "success" | "idea";

const calloutColors: Record<string, string> = {
  info: "oklch(62.3% 0.214 259.815)",
  warning: "oklch(76.9% 0.188 70.08)",
  error: "oklch(63.7% 0.237 25.331)",
  success: "oklch(72.3% 0.219 149.579)",
  idea: "oklch(70.5% 0.209 60.849)",
};

function resolveType(type: CalloutType): string {
  if (type === "warn") return "warning";
  return type;
}

const iconClass = "size-5 -me-0.5";

const icons: Record<string, ReactNode> = {
  info: <Info className={iconClass} />,
  warning: <TriangleAlert className={iconClass} />,
  error: <CircleX className={iconClass} />,
  success: <CircleCheck className={iconClass} />,
  idea: <Lightbulb className={iconClass} />,
};

export function Callout({
  children,
  title,
  type: inputType = "info",
  icon,
  className,
  style,
  ...props
}: {
  title?: ReactNode;
  type?: CalloutType;
  icon?: ReactNode;
} & Omit<ComponentProps<"div">, "title">) {
  const type = resolveType(inputType);
  const color = calloutColors[type] ?? calloutColors.info;

  return (
    <div
      className={`flex gap-2 my-4 rounded-xl p-3 ps-1 text-sm shadow-md text-fd-card-foreground${className ? ` ${className}` : ""}`}
      style={{
        border: `1px solid ${color}`,
        background: `color-mix(in oklch, ${color} 15%, transparent)`,
        ...style,
      }}
      {...props}
    >
      <div
        role="none"
        className="w-0.5 rounded-sm"
        style={{ background: color }}
      />
      <div style={{ color, fill: color }} className="flex items-start">
        {icon ?? icons[type]}
      </div>
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        {title && (
          <p className="font-medium my-0!">{title}</p>
        )}
        <div className="text-fd-muted-foreground prose-no-margin empty:hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
