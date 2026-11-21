"use client";

/** A courier menu that submits its form as soon as a courier is chosen. */
export function AssignSelect({ options, label, className }: { options: { id: string; name: string }[]; label: string; className?: string }) {
  return (
    <select name="courierId" defaultValue="" aria-label={label} className={className ?? "ui-field field"} onChange={(e) => e.currentTarget.value && e.currentTarget.form?.requestSubmit()}>
      <option value="" disabled>{label}</option>
      {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );
}
