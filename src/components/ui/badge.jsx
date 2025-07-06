import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ring-1 ring-inset",
        variant === "success" && "bg-green-100 text-green-800 ring-green-300",
        variant === "secondary" && "bg-blue-100 text-blue-800 ring-blue-300",
        variant === "outline" && "bg-transparent text-gray-800 ring-gray-300",
        className
      )}
    >
      {props.children}
    </span>
  );
}
