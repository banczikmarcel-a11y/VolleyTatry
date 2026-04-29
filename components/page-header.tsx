import Link from "next/link";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow: string;
  className?: string;
  description?: string;
  homeHref?: string;
  inline?: boolean;
  title: string;
};

export function PageHeader({ eyebrow, title, description, homeHref, inline = false, className }: PageHeaderProps) {
  return (
    <header className={cn("max-w-3xl", className)}>
      {homeHref ? (
        <Link href={homeHref} className="text-sm font-black text-court-blue underline decoration-court-mint underline-offset-4">
          Domov
        </Link>
      ) : null}
      {inline ? (
        <div className={cn("flex flex-wrap items-baseline gap-2", homeHref ? "mt-2" : "")}>
          <p className="text-lg font-black uppercase leading-tight text-court-ink sm:text-2xl">{eyebrow}</p>
          <span className="text-lg font-black leading-tight text-court-ink sm:text-2xl">&gt;</span>
          <h1 className="text-lg font-black leading-tight text-court-ink sm:text-2xl">{title}</h1>
        </div>
      ) : (
        <>
          <p className={cn("text-[13px] font-black uppercase text-court-mint sm:text-sm", homeHref ? "mt-2" : "")}>{eyebrow}</p>
          <h1 className="mt-1.5 text-2xl font-black leading-tight text-court-ink sm:mt-2 sm:text-4xl">{title}</h1>
        </>
      )}
      {description ? <p className="mt-2 text-sm leading-6 text-court-blue sm:mt-3 sm:text-base sm:leading-7">{description}</p> : null}
    </header>
  );
}
