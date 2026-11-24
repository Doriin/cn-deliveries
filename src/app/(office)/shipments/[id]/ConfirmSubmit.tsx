"use client";

import type { ComponentProps } from "react";
import { SubmitButton } from "@/components/SubmitButton";

/** A submit button that asks first (deleting a payment). */
export function ConfirmSubmit({ message, ...props }: ComponentProps<typeof SubmitButton> & { message: string }) {
  return <SubmitButton {...props} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }} />;
}
