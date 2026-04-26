import Link from "next/link";
import { QuickMatchForm } from "@/components/admin/quick-match-form";
import { Card } from "@/components/ui/card";
import { requireAdminUser } from "@/lib/admin";

type NewMatchPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getNextMonday() {
  const today = new Date();
  const daysUntilMonday = (1 - today.getDay() + 7) % 7;
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilMonday);
}

function getMondayOptions() {
  const firstMonday = getNextMonday();
  const formatter = new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: "long",
    weekday: "long"
  });

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(firstMonday.getFullYear(), firstMonday.getMonth(), firstMonday.getDate() + index * 7);

    return {
      label: formatter.format(date),
      value: formatDateInputValue(date)
    };
  });
}

export default async function NewMatchPage({ searchParams }: NewMatchPageProps) {
  const params = await searchParams;
  await requireAdminUser("/admin/matches/new");
  const dateOptions = getMondayOptions();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/matches" className="text-sm font-black text-court-ink underline decoration-court-mint underline-offset-4">
        Spat na zapasy
      </Link>

      <Card className="bg-court-ice">
        <p className="text-sm font-black uppercase text-court-mint">Rychle vytvorenie</p>
        <p className="mt-2 text-sm leading-6 text-court-blue">
          Ak uz pre vybrany den existuje zapas, vytvorenie sa zastavi a zobrazime upozornenie.
        </p>
      </Card>

      <QuickMatchForm dateOptions={dateOptions} defaultDate={dateOptions[0].value} error={params?.error} />
    </div>
  );
}
