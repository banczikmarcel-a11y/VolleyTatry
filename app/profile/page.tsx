import { PageHeader } from "@/components/page-header";
import { PlayerProfileStats } from "@/components/profile/player-profile-stats";
import { Card } from "@/components/ui/card";
import { QueryToast } from "@/components/ui/query-toast";
import { updateProfileEmail } from "@/app/profile/actions";
import { getCurrentPlayerProfile } from "@/lib/profile";
import { getCurrentUser } from "@/supabase/server";

type ProfilePageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <PageHeader eyebrow="Profil" title="Profil hráča" description="Po prihlásení sa tu zobrazia tvoje údaje a štatistiky." />
        <Card>
          <p className="text-sm font-black uppercase text-court-mint">Bez prihlásenia</p>
          <p className="mt-2 text-sm leading-6 text-court-blue">Prihlás sa a otvor si svoj hráčsky profil.</p>
        </Card>
      </div>
    );
  }

  const { error, isConfigured, profile } = await getCurrentPlayerProfile(user.id);

  if (!isConfigured) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <PageHeader eyebrow="Profil" title="Profil hráča" description="Profil bude dostupný po pripojení databázy Supabase." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <PageHeader eyebrow="Profil" title="Profil hráča" description="Nepodarilo sa načítať údaje o prihlásenom používateľovi." />
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm font-bold text-red-700">{error ?? "Profil nebol nájdený."}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <QueryToast error={params?.error} message={params?.message} />
      <PageHeader
        eyebrow="Profil"
        title={profile.fullName}
        description={profile.teamNames.length > 0 ? `Predvolený tím: ${profile.teamNames[0]}` : "Používateľ zatiaľ nemá priradený aktívny tím."}
      />

      <section className="grid gap-4 sm:gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="space-y-4 bg-court-navy text-white">
          <div>
            <p className="text-sm font-black uppercase text-court-mint">Prihlásený používateľ</p>
            <h2 className="mt-2 text-2xl font-black">{profile.fullName}</h2>
            <p className="mt-2 text-sm text-court-line">{profile.email ?? "Bez e-mailu"}</p>
          </div>
          <form action={updateProfileEmail} className="space-y-2">
            <label className="block">
              <span className="text-xs font-black uppercase text-court-line">Upraviť e-mail</span>
              <input
                name="email"
                type="email"
                defaultValue={profile.email ?? ""}
                className="focus-ring mt-1.5 w-full rounded-[8px] border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-bold text-white sm:mt-2 sm:py-3"
                placeholder="tvoj@email.sk"
                required
              />
            </label>
            <button
              type="submit"
              className="focus-ring w-full rounded-[8px] bg-court-mint px-3 py-2.5 text-sm font-black text-court-ink transition hover:bg-white sm:py-3"
            >
              Uložiť e-mail
            </button>
          </form>
          <div className="rounded-[8px] bg-white/10 p-3 sm:p-4">
            <p className="text-xs font-black uppercase text-court-line">Predvolený tím</p>
            <p className="mt-2 text-sm font-bold">{profile.teamNames.length > 0 ? profile.teamNames[0] : "Bez tímu"}</p>
          </div>
        </Card>

        <PlayerProfileStats
          profile={profile}
          yearlyTitle="Výsledky hráča"
          emptyHistoryText="Zatiaľ sa tu nezobrazil žiadny ukončený zápas s potvrdenou účasťou."
        />
      </section>
    </div>
  );
}
