import { ChevronDown } from "lucide-react";
import { statusLabel, type ApplicationStatus, type Gender } from "@/lib/userData";

export function StatusSelect({ gender, value, onChange }: { gender: Gender; value: ApplicationStatus | null; onChange: (value: ApplicationStatus | null) => void }) {
  return (
    <NativeSelect
      ariaLabel="Статус заявки"
      value={value ?? ""}
      onChange={(next) => onChange(next === "" ? null : (next as ApplicationStatus))}
      options={[
        ["", "Статус заявки: не начата"],
        ["in_progress", `Статус: ${statusLabel("in_progress", gender)}`],
        ["submitted", `Статус: ${statusLabel("submitted", gender)}`],
      ]}
    />
  );
}

export function NativeSelect({ value, onChange, options, ariaLabel }: { value: string; onChange: (value: string) => void; options: Array<[string, string]>; ariaLabel?: string }) {
  return (
    <span className="relative block">
      <select aria-label={ariaLabel} className="h-9 w-full appearance-none truncate rounded-md border border-input bg-background px-3 pr-8 text-sm font-normal shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, label]) => <option key={optionValue || "__empty"} value={optionValue}>{label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  );
}

