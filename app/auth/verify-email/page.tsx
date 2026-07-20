import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { QueryToast } from "@/components/ui/query-toast";
import { Button } from "@/components/ui/button";
import { FormCard } from "@/components/ui/card";
import { resendVerificationEmail } from "@/app/auth/actions";

type VerifyEmailPageProps = {
  searchParams?: Promise<{
    email?: string;
    error?: string;
    message?: string;
    next?: string;
  }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <QueryToast error={params?.error} message={params?.message} />
      <PageHeader
        eyebrow="Overenie"
        title="Potvrď svoj e-mail"
        description="Kým nebude e-mail potvrdený, aplikácia nepovolí vstup do chránenej časti."
        homeHref="/login"
      />

      <FormCard action={resendVerificationEmail} className="space-y-4">
        <input type="hidden" name="next" value={params?.next ?? "/dashboard"} />
        <input type="hidden" name="email" value={params?.email ?? ""} />
        <p className="text-sm text-court-blue">
          Overovací e-mail bol odoslaný na <span className="font-bold text-court-ink">{params?.email ?? "tvoj e-mail"}</span>.
        </p>
        <p className="text-sm text-court-blue">
          Po kliknutí na overovací odkaz sa vráť späť do aplikácie a pokračuj prihlásením.
        </p>
        <Button type="submit" className="w-full py-3">
          Poslať overovací e-mail znova
        </Button>
        <Link href="/login" className="block text-center text-sm font-bold text-court-ink underline decoration-court-mint underline-offset-4">
          Späť na prihlásenie
        </Link>
      </FormCard>
    </div>
  );
}
