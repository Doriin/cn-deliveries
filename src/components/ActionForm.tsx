"use client";

import { createContext, useActionState, useEffect, useRef, useState, startTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert } from "./ui";

export type FormState = { error?: string; ok?: boolean; message?: string };

/** Lets a SubmitButton inside an ActionForm know the form is saving, and whether it was the button pressed. */
export const FormPendingContext = createContext<{ pending: boolean; submitter: string | null }>({ pending: false, submitter: null });

/**
 * Form bound to a server action. Keeps field values on error (no automatic reset) and disables inputs while saving.
 * Errors stay next to the form; success is a short toast so the page doesn't jump.
 */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, run, pending] = useActionState(action, {});
  const [pressed, setPressed] = useState<string | null>(null);
  const te = useTranslations("errors");
  const tc = useTranslations("common");
  const alert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.ok) toast.success(state.message ?? tc("saved"), { position: "bottom-right" });
    if (state.error) alert.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    // A new state object arrives after every submit, so this runs once per save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form
      className={className}
      aria-busy={pending}
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        // Buttons marked data-native submit normally (e.g. formAction to a GET route that opens a PDF).
        if (submitter?.dataset.native) return;
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (submitter?.name) fd.set(submitter.name, submitter.value);
        setPressed(submitter?.name ? `${submitter.name}=${submitter.value}` : null);
        startTransition(() => run(fd));
      }}
    >
      <fieldset disabled={pending} className="contents">
        {state.error && <div ref={alert} className="col-span-full basis-full scroll-mt-20"><Alert>{te(state.error)}</Alert></div>}
        <FormPendingContext.Provider value={{ pending, submitter: pressed }}>{children}</FormPendingContext.Provider>
      </fieldset>
    </form>
  );
}
