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
      <div className="bg-court-ink p-4 text-white sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-court-mint text-court-ink sm:h-12 sm:w-12">
            {isLogin ? <Zap className="h-5 w-5 sm:h-6 sm:w-6" /> : <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6" />}
          </div>
          <div className="rounded-[8px] border border-white/15 px-2.5 py-2 text-right sm:px-3">
            <p className="text-xs font-black uppercase text-court-line">Volejbal Tatry</p>
            <p className="text-[13px] font-black text-court-mint sm:text-sm">{isLogin ? "Game ready" : "New player"}</p>
          </div>
        </div>

        <div className="mt-5 sm:mt-6">
          <p className="text-[13px] font-bold uppercase text-court-mint sm:text-sm">Account</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-5 text-court-line sm:leading-6">{description}</p>
        </div>
      </div>

      <div className="p-4 sm:p-6">
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

        <div className="space-y-3.5 sm:space-y-4">
          {showName ? (
            <label className="block">
              <span className="text-[13px] font-bold text-court-ink sm:text-sm">Meno</span>
              <input
                type="text"
                name="name"
                autoComplete="name"
                className="focus-ring mt-1.5 w-full rounded-[8px] border border-court-line px-3 py-2.5 text-sm text-court-ink sm:mt-2 sm:py-3"
                placeholder="Matus Novak"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="text-[13px] font-bold text-court-ink sm:text-sm">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              className="focus-ring mt-1.5 w-full rounded-[8px] border border-court-line px-3 py-2.5 text-sm text-court-ink sm:mt-2 sm:py-3"
              placeholder="hrac@volejbaltatry.sk"
              required
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-bold text-court-ink sm:text-sm">Heslo</span>
            <input
              type="password"
              name="password"
              autoComplete={showName ? "new-password" : "current-password"}
              className="focus-ring mt-1.5 w-full rounded-[8px] border border-court-line px-3 py-2.5 text-sm text-court-ink sm:mt-2 sm:py-3"
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
