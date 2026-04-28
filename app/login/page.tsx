import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { QueryToast } from "@/components/ui/query-toast";
import { getSupabaseConfig } from "@/supabase/env";
import { getCurrentUser } from "@/supabase/server";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const config = getSupabaseConfig();
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5 sm:gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <QueryToast error={params?.error} message={params?.message} />
      <section className="hidden rounded-[8px] bg-court-ink p-6 text-white shadow-panel lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-court-mint">Prístup na zápas</p>
          <h2 className="mt-3 text-4xl font-black leading-tight">Rýchly vstup do kabíny.</h2>
          <p className="mt-4 text-sm leading-6 text-court-line">
            Skontroluj najbližší zápas, potvrdenia hráčov a tímový rytmus pred prvým servisom.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["Servis", "Blok", "Výhra"].map((item) => (
            <div key={item} className="rounded-[8px] border border-white/15 p-3 text-center">
              <p className="text-xs font-black uppercase text-court-line">{item}</p>
              <p className="mt-1 text-xl font-black text-court-mint">Pripravené</p>
            </div>
          ))}
        </div>
      </section>
      <div>
      <AuthForm
        title="Vitaj späť"
        description="Prihlás sa do klubového priestoru Volejbal Tatry."
        submitLabel="Prihlásiť sa"
        mode="login"
        error={params?.error}
        message={params?.message}
        isConfigured={config.isConfigured}
        next={params?.next}
      />
      <p className="mt-4 text-center text-sm text-court-blue sm:mt-5">
        Ešte nemáš účet?{" "}
        <Link href="/register" className="font-bold text-court-ink underline decoration-court-mint underline-offset-4">
          Registrácia
        </Link>
      </p>
      </div>
    </div>
  );
}
