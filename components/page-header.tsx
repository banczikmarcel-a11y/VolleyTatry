type PageHeaderProps = {
  eyebrow: string;
  description?: string;
  title: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="max-w-3xl">
      <p className="text-sm font-black uppercase text-court-mint">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-black leading-tight text-court-ink sm:text-4xl">{title}</h1>
      {description ? <p className="mt-3 text-base leading-7 text-court-blue">{description}</p> : null}
    </header>
  );
}
