export type CriterionStatus = "pass" | "below" | "unknown" | "skip";
export type Category = "Safety" | "Match" | "Reach";

export type Criterion = { label: string; status: CriterionStatus; note: string };

export type Assessment = {
  category: Category;
  comment: string;
  criteria: Criterion[];
  recommendations: string[];
};

export type ProfileInput = {
  gpa: string;
  ielts: string;
  toefl: string;
  sat: string;
  motivation: boolean;
  recommendations: boolean;
  portfolio: boolean;
};

export type ProgramLike = {
  rank: string;
  gpaMin: number | null;
  ieltsMin: number | null;
  toeflMin: number | null;
  standardizedTests: string;
  details: Record<string, string>;
};

export const statusLabels: Record<CriterionStatus, string> = {
  pass: "Проходит",
  below: "Ниже требований",
  unknown: "Нет данных",
  skip: "Не проверяется",
};

function num(value: string) {
  const parsed = Number.parseFloat(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function compare(value: string, minimum: number | null, unit = ""): Criterion["status"] {
  const entered = num(value);
  if (entered === null) return "unknown";
  if (minimum === null) return "pass";
  void unit;
  return entered >= minimum ? "pass" : "below";
}

function documentsText(program: ProgramLike) {
  return Object.entries(program.details)
    .filter(([key]) => /ДОКУМЕНТ|ПРИМЕЧАН|ПОРТФОЛИО/i.test(key))
    .map(([, value]) => value)
    .join(" ")
    .toLocaleLowerCase("ru");
}

function docCriterion(label: string, required: boolean, provided: boolean): Criterion {
  if (!required) return { label, status: "skip", note: "Университет не требует" };
  if (provided) return { label, status: "pass", note: "Требуется и подготовлено" };
  return { label, status: "below", note: "Требуется, но отсутствует" };
}

export function rankTier(rank: string): { tier: "top50" | "mid" | "low"; label: string } {
  const value = num(rank.replace(/[^\d.]/g, " "));
  if (value !== null && value <= 50) return { tier: "top50", label: "Top-50 — высокая конкурсность" };
  if (value !== null && value <= 200) return { tier: "mid", label: "Top-51–200 — средняя конкурсность" };
  return { tier: "low", label: "Ниже Top-200 — умеренная конкурсность" };
}

export function assess(program: ProgramLike, profile: ProfileInput): Assessment {
  const docs = documentsText(program);
  const tests = program.standardizedTests.toLocaleLowerCase("ru");

  const satMentioned = /sat|act/.test(tests);
  const satRequired = satMentioned && /обязат/.test(tests) && !/необязат|не обязат|не требуется/.test(tests);

  const gpaStatus = compare(profile.gpa, program.gpaMin);
  const ieltsStatus = compare(profile.ielts, program.ieltsMin);
  const toeflStatus = compare(profile.toefl, program.toeflMin);

  const criteria: Criterion[] = [
    {
      label: "GPA",
      status: gpaStatus,
      note: program.gpaMin === null ? "Минимум не указан в базе" : `Минимум ${program.gpaMin}`,
    },
    {
      label: "IELTS",
      status: ieltsStatus,
      note: program.ieltsMin === null ? "Минимум не указан в базе" : `Минимум ${program.ieltsMin}`,
    },
    {
      label: "TOEFL",
      status: toeflStatus,
      note: program.toeflMin === null ? "Минимум не указан в базе" : `Минимум ${program.toeflMin}`,
    },
    satRequired
      ? {
          label: "SAT / ACT",
          status: num(profile.sat) === null ? "unknown" : "pass",
          note: "Требуется университетом",
        }
      : { label: "SAT / ACT", status: "skip", note: "Не требуется университетом" },
    docCriterion("Мотивационное письмо", /мотивацион|study plan|personal statement|учебный план/.test(docs), profile.motivation),
    docCriterion("Рекомендательные письма", /рекоменд/.test(docs), profile.recommendations),
    docCriterion("Портфолио", /портфолио|portfolio/.test(docs), profile.portfolio),
  ];

  const checked = criteria.filter((item) => item.status !== "skip");
  const below = checked.filter((item) => item.status === "below");
  const unknown = checked.filter((item) => item.status === "unknown");
  const issues = below.length + unknown.length;
  const { tier, label } = rankTier(program.rank);

  const importantBelow = below.some((item) => ["GPA", "IELTS", "TOEFL", "SAT / ACT"].includes(item.label));

  const margins = [
    program.gpaMin !== null && num(profile.gpa) !== null ? (num(profile.gpa)! - program.gpaMin) / Math.max(program.gpaMin, 1) : null,
    program.ieltsMin !== null && num(profile.ielts) !== null ? (num(profile.ielts)! - program.ieltsMin) / program.ieltsMin : null,
    program.toeflMin !== null && num(profile.toefl) !== null ? (num(profile.toefl)! - program.toeflMin) / program.toeflMin : null,
  ].filter((value): value is number => value !== null);
  const strongProfile = margins.length > 0 && margins.every((value) => value >= 0.08);

  // Правила из документа «Движок оценки»:
  // Reach — важные критерии ниже минимума, Top-50 или более одного проблемного критерия.
  // Safety — все критерии «Проходит» и профиль заметно выше минимума при невысокой конкурсности.
  // Match — большинство требований выполнено, допускается не более одного «Ниже требований»/«Нет данных».
  let category: Category;
  if (tier === "top50" || importantBelow || issues > 1) category = "Reach";
  else if (issues === 0 && strongProfile && tier !== "mid") category = "Safety";
  else category = "Match";

  const recommendations = [
    ...below.map((item) =>
      item.label === "GPA" || item.label === "IELTS" || item.label === "TOEFL" || item.label === "SAT / ACT"
        ? `Повысьте показатель ${item.label}: ${item.note.toLocaleLowerCase("ru")}.`
        : `Подготовьте: ${item.label.toLocaleLowerCase("ru")} — требуется университетом.`,
    ),
    ...unknown.map((item) => `Укажите данные по критерию «${item.label}» для точной оценки.`),
  ];
  if (tier === "top50" && recommendations.length === 0) {
    recommendations.push("Университет входит в Top-50: усильте профиль внеучебными достижениями и сильным мотивационным письмом.");
  }

  const comment =
    category === "Safety"
      ? "Ваш профиль превышает требования университета. Вероятность поступления высокая."
      : category === "Match"
        ? "Ваш профиль соответствует требованиям университета. Шансы поступления хорошие."
        : "Университет является амбициозным вариантом. Для повышения вероятности поступления рекомендуется улучшить отдельные показатели.";

  return { category, comment: `${comment} (${label})`, criteria, recommendations };
}
