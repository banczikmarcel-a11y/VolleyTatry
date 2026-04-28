type PageHeaderProps = {
  eyebrow: string;
  description?: string;
  title: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="max-w-3xl">
      <p className="text-[13px] font-black uppercase text-court-mint sm:text-sm">{eyebrow}</p>
      <h1 className="mt-1.5 text-2xl font-black leading-tight text-court-ink sm:mt-2 sm:text-4xl">{title}</h1>
      {description ? <p className="mt-2 text-sm leading-6 text-court-blue sm:mt-3 sm:text-base sm:leading-7">{description}</p> : null}
    </header>
  );
}
