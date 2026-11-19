// Fases de dose tiradas do histórico de aplicações.

export type InjectionLike = { at: string; dose_mcg: number | null };

export type DosePhase = {
  mcg: number;
  from: string; // dia da primeira aplicação nessa dose
  to: string | null; // dia da primeira aplicação da dose seguinte (exclusivo); null = fase atual
  days: string[]; // dias das aplicações da fase
};

/** Sequências de aplicações com a mesma dose. Semanas puladas não quebram a fase. */
export function dosePhases(injections: readonly InjectionLike[]): DosePhase[] {
  const doses = injections
    .filter((i): i is { at: string; dose_mcg: number } => i.dose_mcg !== null)
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const phases: DosePhase[] = [];
  for (const inj of doses) {
    const day = inj.at.slice(0, 10);
    const last = phases[phases.length - 1];
    if (last && last.mcg === inj.dose_mcg) {
      last.days.push(day);
      continue;
    }
    if (last) last.to = day;
    phases.push({ mcg: inj.dose_mcg, from: day, to: null, days: [day] });
  }
  return phases;
}

/** Índice da fase em que um dia cai; −1 antes da primeira aplicação. */
export function phaseIndexOn(phases: readonly DosePhase[], day: string): number {
  for (let i = phases.length - 1; i >= 0; i--) {
    if (phases[i].from <= day) return i;
  }
  return -1;
}

/** Dose em vigor num dia (a da última aplicação até ele), ou null antes do tratamento. */
export function doseOn(phases: readonly DosePhase[], day: string): number | null {
  const i = phaseIndexOn(phases, day);
  return i >= 0 ? phases[i].mcg : null;
}
