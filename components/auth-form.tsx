import { Dumbbell, Mail, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormCard } from "@/components/ui/card";
import { sendMagicLink, signInWithPassword, signUpWithPassword } from "@/app/auth/actions";

type AuthFormProps = {
  title: string;
  description: string;
  submitLabel: string;
  mode: "login" | "register";
  showName?: boolean;
  message?: string;
  error?: string;
  isConfigured?: boolean;
  next?: string;
};

export function AuthForm({
  title,
  description,
  submitLabel,
  mode,
  showName = false,
  message,
  error,
  isConfigured = true,
  next = "/dashboard"
}: AuthFormProps) {
  const primaryAction = mode === "login" ? signInWithPassword : signUpWithPassword;
  const isLogin = mode === "login";

  return (
    <FormCard action={primaryAction} className="overflow-hidden p-0 shadow-panel">
      <div className="bg-court-ink p-6 text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-court-mint text-court-ink">
            {isLogin ? <Zap className="h-6 w-6" /> : <Dumbbell className="h-6 w-6" />}
          </div>
          <div className="rounded-[8px] border border-white/15 px-3 py-2 text-right">
            <p className="text-xs font-black uppercase text-court-line">Volejbal Tatry</p>
            <p className="text-sm font-black text-court-mint">{isLogin ? "Game ready" : "New player"}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-bold uppercase text-court-mint">Account</p>
          <h1 className="mt-2 text-3xl font-black">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-court-line">{description}</p>
        </div>
      </div>

      <div className="p-6">
      <input type="hidden" name="next" value={next} />

      {!isConfigured ? (
        <p className="mb-4 rounded-[8px] border border-court-coral bg-court-coral/10 px-3 py-2 text-sm font-bold text-court-ink">
          Add Supabase environment variables to enable authentication.
        </p>
      ) : null}

      {message ? (
        <p className="mb-4 flex items-start gap-2 rounded-[8px] border border-court-mint bg-court-ice px-3 py-2 text-sm font-bold text-court-ink">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-court-mint" />
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        {showName ? (
          <label className="block">
            <span className="text-sm font-bold text-court-ink">Meno</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              className="focus-ring mt-2 w-full rounded-[8px] border border-court-line px-3 py-3 text-sm text-court-ink"
              placeholder="Matus Novak"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="text-sm font-bold text-court-ink">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            className="focus-ring mt-2 w-full rounded-[8px] border border-court-line px-3 py-3 text-sm text-court-ink"
            placeholder="hrac@volejbaltatry.sk"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-court-ink">Heslo</span>
          <input
            type="password"
            name="password"
            autoComplete={showName ? "new-password" : "current-password"}
            className="focus-ring mt-2 w-full rounded-[8px] border border-court-line px-3 py-3 text-sm text-court-ink"
            minLength={showName ? 8 : undefined}
            placeholder={showName ? "aspon 8 znakov" : "password"}
            required
          />
        </label>
      </div>

      <Button
        type="submit"
        disabled={!isConfigured}
        className="mt-6 w-full py-3"
      >
        {submitLabel}
      </Button>

      {mode === "login" ? (
        <Button
          type="submit"
          formAction={sendMagicLink}
          variant="secondary"
          disabled={!isConfigured}
          className="mt-3 w-full py-3"
        >
          <Mail className="mr-2 h-4 w-4" />
          Send magic link
        </Button>
      ) : null}
      </div>
    </FormCard>
  );
}
