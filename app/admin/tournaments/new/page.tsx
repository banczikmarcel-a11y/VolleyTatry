import Link from "next/link";
import { createTournamentAction } from "@/app/admin/tournaments/actions";
import { PageHeader } from "@/components/page-header";
import { QueryToast } from "@/components/ui/query-toast";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormCard } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { requireAdminUser } from "@/lib/admin";
import { createTournamentRepository } from "@/src/server/tournaments";

type PageProps = {
  searchParams?: Promise<{ error?: string; message?: string }>;
};

function getDefaultDateParts() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function NewTournamentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  await requireAdminUser("/admin/tournaments/new");
  const repository = await createTournamentRepository();
  const formatsResult = await repository.listTournamentFormats();
  const formats = formatsResult.ok ? formatsResult.data.filter((item) => item.is_active) : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <QueryToast error={params?.error} message={params?.message} />
      <PageHeader
        eyebrow="Admin"
        title="Nový turnaj"
        description="Vytvor turnaj s mobilne použiteľnou konfiguráciou rozpisu."
        homeHref="/admin/tournaments"
      />

      <FormCard action={createTournamentAction} className="space-y-5">
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-court-ink">Názov</span>
            <input name="name" required className="focus-ring min-h-11 rounded-[8px] border border-court-line px-4 py-3 text-base" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-court-ink">Dátum</span>
              <input type="date" name="date" required defaultValue={getDefaultDateParts()} className="focus-ring min-h-11 rounded-[8px] border border-court-line px-4 py-3 text-base" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-court-ink">Začiatok</span>
              <input type="time" name="start_time" required defaultValue="08:30" className="focus-ring min-h-11 rounded-[8px] border border-court-line px-4 py-3 text-base" />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-court-ink">Miesto</span>
            <input name="location" required className="focus-ring min-h-11 rounded-[8px] border border-court-line px-4 py-3 text-base" />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-court-ink">Ihriská</span>
              <input type="number" min={1} step={1} name="court_count" required defaultValue={2} className="focus-ring min-h-11 rounded-[8px] border border-court-line px-4 py-3 text-base" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-court-ink">Zápas (min)</span>
              <input type="number" min={1} step={1} name="match_duration_minutes" required defaultValue={20} className="focus-ring min-h-11 rounded-[8px] border border-court-line px-4 py-3 text-base" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-court-ink">Prestávka (min)</span>
              <input type="number" min={0} step={1} name="break_duration_minutes" required defaultValue={5} className="focus-ring min-h-11 rounded-[8px] border border-court-line px-4 py-3 text-base" />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-court-ink">Formát turnaja</span>
            <select name="format_key" required className="focus-ring min-h-11 rounded-[8px] border border-court-line px-4 py-3 text-base">
              <option value="">Vyber formát</option>
              {formats.map((format) => (
                <option key={format.id} value={format.key}>
                  {format.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SubmitButton className="w-full py-3" idleLabel="Vytvoriť turnaj" pendingLabel="Vytváram turnaj..." />
          <Link href="/admin/tournaments" className={buttonClasses({ className: "w-full justify-center py-3", variant: "secondary" })}>
            Návrat
          </Link>
        </div>
      </FormCard>
    </div>
  );
}
