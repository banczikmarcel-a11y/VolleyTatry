import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { QueryToast } from "@/components/ui/query-toast";
import { getSupabaseConfig } from "@/supabase/env";
import { getCurrentUser } from "@/supabase/server";

type RegisterPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const config = getSupabaseConfig();
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5 sm:gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <QueryToast error={params?.error} message={params?.message} />
      <div>
      <AuthForm
        title="Pridaj sa k tímu"
        description="Vytvor si prístup pre hráčsky alebo trénerský dashboard."
        submitLabel="Vytvoriť účet"
        mode="register"
        showName
        error={params?.error}
        message={params?.message}
        isConfigured={config.isConfigured}
      />
      <p className="mt-4 text-center text-sm text-court-blue sm:mt-5">
        Už máš účet?{" "}
        <Link href="/login" className="font-bold text-court-ink underline decoration-court-mint underline-offset-4">
          Prihlásenie
        </Link>
      </p>
      </div>
      <section className="hidden rounded-[8px] border border-court-line bg-white p-6 shadow-sm lg:block">
        <p className="text-sm font-black uppercase text-court-coral">Miesto v zostave</p>
        <h2 className="mt-3 text-4xl font-black leading-tight text-court-ink">Tvoj profil čaká na prvý zápas.</h2>
        <div className="mt-8 space-y-3">
          {["Tímové pozvánky", "Zápasy a odpovede", "Hráčsky profil"].map((item) => (
            <div key={item} className="rounded-[8px] bg-court-ice p-4">
              <p className="text-sm font-black text-court-ink">{item}</p>
              <p className="mt-1 text-sm text-court-blue">Pripravené na Supabase dáta a klubové roly.</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
