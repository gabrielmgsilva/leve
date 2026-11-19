import type { InjectionRow, Site } from '@/db/queries';
import type { BackupCounts } from '@/domain/backup';
import { findModel, type PenLike } from '@/domain/pens';
import type { BmiBand } from '@/domain/weight';

import { dayShort, joinPt, mg, plural, timeOf } from './format';

export const SITE_LABEL: Record<Site, string> = {
  AE: 'Abdômen E',
  AD: 'Abdômen D',
  CE: 'Coxa E',
  CD: 'Coxa D',
  BE: 'Braço E',
  BD: 'Braço D',
};

/** Por extenso, em minúsculas: "abdômen direito". */
export const SITE_NAME: Record<Site, string> = {
  AE: 'abdômen esquerdo',
  AD: 'abdômen direito',
  CE: 'coxa esquerda',
  CD: 'coxa direita',
  BE: 'braço esquerdo',
  BD: 'braço direito',
};

/** Com a preposição: "no abdômen direito", "na coxa esquerda". */
export const SITE_IN: Record<Site, string> = {
  AE: 'no abdômen esquerdo',
  AD: 'no abdômen direito',
  CE: 'na coxa esquerda',
  CD: 'na coxa direita',
  BE: 'no braço esquerdo',
  BD: 'no braço direito',
};

/** "Abdômen E" → "abdômen E", para o meio de uma frase. */
export function siteInline(site: Site): string {
  const label = SITE_LABEL[site];
  return label.charAt(0).toLowerCase() + label.slice(1);
}

/** Sintomas em ordem de exibição. "well" é o "Bem" do Diário. */
export const SYMPTOM_LABEL: Record<string, string> = {
  well: 'Tudo bem',
  nausea: 'Náusea',
  vomiting: 'Vômito',
  diarrhea: 'Diarreia',
  constipation: 'Constipação',
  heartburn: 'Azia',
  abdominal_pain: 'Dor abdominal',
  headache: 'Dor de cabeça',
  fatigue: 'Cansaço',
  dizziness: 'Tontura',
  site_reaction: 'Reação no local',
  low_appetite: 'Pouca fome',
  early_satiety: 'Saciedade rápida',
  other: 'Outro',
  note: 'Nota',
};

export const LEVEL_LABEL: Record<number, string> = { 1: 'leve', 2: 'moderada', 3: 'forte' };

/** Medidas corporais, na ordem do formulário. */
export const MEASURE_LABEL: Record<string, string> = {
  waist: 'Cintura',
  hip: 'Quadril',
  abdomen: 'Abdômen',
  chest: 'Busto',
  arm: 'Braço',
  thigh: 'Coxa',
};

/** Onde passar a fita, para medir sempre do mesmo jeito. */
export const MEASURE_HINT: Record<string, string> = {
  waist: 'na parte mais fina do tronco',
  hip: 'na parte mais larga do quadril',
  abdomen: 'na altura do umbigo',
  chest: 'na parte mais cheia do busto',
  arm: 'no meio do braço, relaxado',
  thigh: 'no meio da coxa',
};

export const BMI_BAND_LABEL: Record<BmiBand, string> = {
  under: 'abaixo do peso',
  normal: 'peso adequado',
  over: 'sobrepeso',
  obese1: 'obesidade grau 1',
  obese2: 'obesidade grau 2',
  obese3: 'obesidade grau 3',
};

/** "Wegovy 1 mg", "Ozivy 0,25/0,5 mg" ou, fora do catálogo, marca e dose (ou conteúdo). */
export function penLabel(pen: Pick<PenLike, 'brand' | 'total_mcg' | 'dose_mcg'>): string {
  const model = findModel(pen);
  if (model) return `${pen.brand} ${model.model}`;
  return pen.dose_mcg !== null ? `${pen.brand} ${mg(pen.dose_mcg)}` : `${pen.brand} · ${mg(pen.total_mcg)}`;
}

/** "dom., 15/11 · 08:12" */
export function injectionTitle(i: Pick<InjectionRow, 'at'>): string {
  return `${dayShort(i.at.slice(0, 10))} · ${timeOf(i.at)}`;
}

/** "1 mg · abdômen E · caneta 4" ou "semana pulada" */
export function injectionDetail(i: InjectionRow, numbers: ReadonlyMap<number, number>): string {
  if (i.dose_mcg === null) return i.note ? `semana pulada · ${i.note}` : 'semana pulada';
  return [mg(i.dose_mcg), i.site ? siteInline(i.site) : null, i.pen_id !== null ? `caneta ${numbers.get(i.pen_id) ?? '?'}` : null]
    .filter(Boolean)
    .join(' · ');
}

/** "48 pesagens, 13 aplicações, 4 canetas, 9 anotações e 2 fotos." */
export function backupSummary(n: BackupCounts): string {
  const parts = [
    plural(n.weights, 'pesagem', 'pesagens'),
    plural(n.injections, 'aplicação', 'aplicações'),
    plural(n.pens, 'caneta', 'canetas'),
    plural(n.journal, 'anotação', 'anotações'),
  ];
  if (n.measures) parts.push(plural(n.measures, 'medição', 'medições'));
  if (n.photos) parts.push(plural(n.photos, 'foto', 'fotos'));
  return `${joinPt(parts)}.`;
}
