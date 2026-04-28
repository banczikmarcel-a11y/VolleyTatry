import type { ElementType, FormHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: Extract<ElementType, "aside" | "article" | "div" | "section">;
};

export function Card({ as: Component = "div", className, ...props }: CardProps) {
  return (
    <Component
      className={cn("rounded-[8px] border border-court-line bg-white p-4 shadow-sm sm:p-5", className)}
      {...props}
    />
  );
}

export function FormCard({ className, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form
      className={cn("rounded-[8px] border border-court-line bg-white p-4 shadow-sm sm:p-5", className)}
      {...props}
    />
  );
}
