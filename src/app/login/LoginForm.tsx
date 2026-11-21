"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm() {
  const t = useTranslations("login");
  const te = useTranslations("errors");
  const [state, action] = useActionState<LoginState, FormData>(login, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="space-y-5">
      {state.error && <Alert>{te(state.error)}</Alert>}
      <Field label={t("email")}>
        <Input name="email" type="email" inputMode="email" required autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus className="!h-12 w-full" />
      </Field>
      <Field label={t("password")}>
        <span className="relative block">
          <Input name="password" type={show ? "text" : "password"} required autoComplete="current-password" enterKeyHint="go" className="!h-12 w-full pr-12" />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? t("hidePassword") : t("showPassword")}
            aria-pressed={show}
            className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-lg text-slate-400 transition-colors duration-150 hover:text-slate-700"
          >
            {show ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
          </button>
        </span>
      </Field>
      <SubmitButton size="lg" className="w-full">{t("submit")}</SubmitButton>
    </form>
  );
}
