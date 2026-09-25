import { ExternalLink, Scale, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Assessment } from "@/lib/assessment";
import type { CatalogProgram } from "@/lib/userData";

type Row = {
  label: string;
  value: (program: CatalogProgram) => string;
  /** Как найти лучшее значение в строке (меньше = лучше). */
  best?: (program: CatalogProgram) => number | null;
};

const rankNumber = (program: CatalogProgram) => {
  const parsed = Number.parseInt(String(program.rank).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const rows: Row[] = [
  { label: "Страна, город", value: (p) => `${p.country}, ${p.city}` },
  { label: "Рейтинг QS", value: (p) => `QS ${p.rank}`, best: rankNumber },
  { label: "Уровень", value: (p) => p.levels.join(", ") },
  { label: "Языки обучения", value: (p) => p.languages.join(", ") },
  { label: "Специальности", value: (p) => p.majors.join(", ") },
  { label: "GPA", value: (p) => p.gpa, best: (p) => p.gpaMin },
  { label: "IELTS", value: (p) => p.ielts, best: (p) => p.ieltsMin },
  { label: "TOEFL", value: (p) => p.toefl, best: (p) => p.toeflMin },
  { label: "Языковой экзамен", value: (p) => p.languageExamRequirement || "—" },
  { label: "Стандартизированные тесты", value: (p) => p.standardizedTests || "—" },
  { label: "Стоимость в год", value: (p) => p.cost, best: (p) => p.costMin },
];

function bestIndexes(programs: CatalogProgram[], best: Row["best"]) {
  if (!best || programs.length < 2) return new Set<number>();
  const values = programs.map((program) => best(program));
  const known = values.filter((value): value is number => value !== null && value !== undefined);
  if (known.length < 2) return new Set<number>();
  const min = Math.min(...known);
  if (known.every((value) => value === min)) return new Set<number>();
  return new Set(values.flatMap((value, index) => (value === min ? [index] : [])));
}

const categoryStyles = {
  Safety: "bg-accent text-accent-foreground",
  Match: "bg-secondary text-secondary-foreground",
  Reach: "bg-muted text-foreground",
} as const;

/** Нижняя плашка «Сравнение: 2 из 3» в каталоге. */
export function CompareBar({ count, max, onOpen, onClear }: { count: number; max: number; onOpen: () => void; onClear: () => void }) {
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
        <Scale className="size-5 shrink-0 text-accent" />
        <p className="flex-1 text-sm font-medium">Сравнение: {count} из {max}</p>
        <Button size="sm" variant="ghost" onClick={onClear}>Очистить</Button>
        <Button size="sm" onClick={onOpen} disabled={count < 2} title={count < 2 ? "Выберите хотя бы 2 программы" : undefined}>Сравнить</Button>
      </div>
    </div>
  );
}

export function CompareDialog({
  open,
  onOpenChange,
  programs,
  assessments,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programs: CatalogProgram[];
  assessments: Map<string, Assessment | null>;
  onRemove: (program: CatalogProgram) => void;
}) {
  const hasAssessment = programs.some((program) => assessments.get(`${program.university}::${program.program}`));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto bg-background p-4 sm:rounded-xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl"><Scale className="size-5 text-accent" /> Сравнение программ</DialogTitle>
          <DialogDescription>
            <Trophy className="mr-1 inline size-3.5 text-accent" /> отмечает лучшее значение в строке: выше рейтинг, ниже требования или стоимость.
          </DialogDescription>
        </DialogHeader>

        {programs.length < 2 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Выберите хотя бы две программы в каталоге.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="w-40 p-2" />
                  {programs.map((program) => (
                    <th key={`${program.university}::${program.program}`} className="rounded-t-lg border border-b-0 border-border bg-card p-3 text-left align-top font-normal">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display font-bold">{program.university}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{program.program}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => onRemove(program)} aria-label={`Убрать ${program.university} из сравнения`}><X /></Button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hasAssessment && (
                  <tr>
                    <th scope="row" className="border-t border-border p-2 text-left align-top text-xs font-medium text-muted-foreground">Ваши шансы</th>
                    {programs.map((program) => {
                      const assessment = assessments.get(`${program.university}::${program.program}`);
                      return (
                        <td key={program.university + program.program} className="border-x border-t border-border bg-card p-3 align-top">
                          {assessment ? <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${categoryStyles[assessment.category]}`}>{assessment.category}</span> : "—"}
                        </td>
                      );
                    })}
                  </tr>
                )}
                {rows.map((row) => {
                  const best = bestIndexes(programs, row.best);
                  return (
                    <tr key={row.label}>
                      <th scope="row" className="border-t border-border p-2 text-left align-top text-xs font-medium text-muted-foreground">{row.label}</th>
                      {programs.map((program, index) => (
                        <td key={program.university + program.program} className={`border-x border-t border-border p-3 align-top ${best.has(index) ? "bg-accent/15 font-semibold" : "bg-card"}`}>
                          {best.has(index) && <Trophy className="mr-1 inline size-3.5 text-accent" aria-label="Лучшее значение" />}
                          {row.value(program)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr>
                  <th scope="row" className="border-t border-border p-2" />
                  {programs.map((program) => (
                    <td key={program.university + program.program} className="rounded-b-lg border border-border bg-card p-3">
                      <a href={program.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                        Официальный сайт <ExternalLink className="size-3" />
                      </a>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
