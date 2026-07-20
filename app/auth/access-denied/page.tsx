import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Prístup"
        title="Prístup nebol pridelený"
        description="Tento e-mail je overený, ale v aplikácii k nemu zatiaľ nie je priradený aktívny používateľský profil."
        homeHref="/"
      />

      <Card className="space-y-3">
        <p className="text-sm text-court-blue">
          Ak máš mať prístup do aplikácie, kontaktuj administrátora klubu. Po pridelení profilu sa prihlás znova.
        </p>
        <Link href="/login" className="text-sm font-bold text-court-ink underline decoration-court-mint underline-offset-4">
          Späť na prihlásenie
        </Link>
      </Card>
    </div>
  );
}
