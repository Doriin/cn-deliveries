"use client";

import { useContext, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { FormPendingContext } from "./ActionForm";
import { Button, Spinner } from "./ui";

/** Submit button that shows a spinner while its form is being saved (plain `<form action>` or an ActionForm). */
export function SubmitButton({ children, ...props }: ComponentProps<typeof Button>) {
  const status = useFormStatus();
  const form = useContext(FormPendingContext);
  const mine = form.submitter === null || form.submitter === `${props.name}=${props.value}`;
  const spinning = status.pending || (form.pending && mine);
  return (
    <Button type="submit" {...props} disabled={status.pending || form.pending || props.disabled} aria-busy={spinning}>
      {spinning && <Spinner />}
      {children}
    </Button>
  );
}
