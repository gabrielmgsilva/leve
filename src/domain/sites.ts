// Rodízio de locais de aplicação (R5).

import type { Site } from '@/db/queries';

/** Ordem fixa de desempate: abdômen, coxas e braços; esquerdo antes do direito. */
export const SITE_ORDER: Site[] = ['AE', 'AD', 'CE', 'CD', 'BE', 'BD'];

export const DEFAULT_SITES: Site[] = ['AE', 'AD', 'CE', 'CD'];

export type SiteUse = { site: Site; lastAt: string | null; enabled: boolean };

type InjectionSite = { at: string; site: Site | null; dose_mcg: number | null };

/** Último uso de cada local, na ordem fixa. Semanas puladas não contam. */
export function siteUses(injections: readonly InjectionSite[], enabled: readonly Site[]): SiteUse[] {
  const last = new Map<Site, string>();
  for (const i of injections) {
    if (!i.site || i.dose_mcg === null) continue;
    const prev = last.get(i.site);
    if (!prev || prev < i.at) last.set(i.site, i.at);
  }
  return SITE_ORDER.map((site) => ({ site, lastAt: last.get(site) ?? null, enabled: enabled.includes(site) }));
}

/**
 * Locais ativos do que descansou mais para o usado por último. O primeiro é a sugestão:
 * nunca usado vem antes; empate segue a ordem fixa.
 */
export function rotation(injections: readonly InjectionSite[], enabled: readonly Site[]): SiteUse[] {
  return siteUses(injections, enabled)
    .filter((u) => u.enabled)
    .sort((a, b) => {
      const x = a.lastAt ?? '';
      const y = b.lastAt ?? '';
      if (x !== y) return x < y ? -1 : 1;
      return SITE_ORDER.indexOf(a.site) - SITE_ORDER.indexOf(b.site);
    });
}

/** Sugestão do próximo local: o ativo usado há mais tempo. */
export function suggestSite(injections: readonly InjectionSite[], enabled: readonly Site[]): Site | null {
  return rotation(injections, enabled)[0]?.site ?? null;
}
