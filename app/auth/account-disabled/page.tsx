import { PageHeader } from "@/components/page-header";
import { FormCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/auth/actions";

export default function AccountDisabledPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Účet"
        title="Prístup bol deaktivovaný"
        description="Tento používateľský profil je momentálne neaktívny, preto nie je možné otvoriť chránený obsah aplikácie."
        homeHref="/"
      />

      <FormCard action={signOut} className="space-y-4">
        <p className="text-sm text-court-blue">
          Ak si myslíš, že ide o chybu, kontaktuj administrátora. Po opätovnej aktivácii účtu sa budeš môcť znovu prihlásiť.
        </p>
        <Button type="submit" className="w-full py-3">
          Odhlásiť sa
        </Button>
      </FormCard>
    </div>
  );
}
