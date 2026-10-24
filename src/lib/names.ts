import type { Prompt, Slot, Tense } from './types';

export const TENSES: Tense[] = ['pres', 'perf', 'imperf', 'mqp_comp', 'fut_ir', 'fut', 'cond', 'prog', 'perf_comp', 'imp', 'subj_pres', 'subj_imperf', 'subj_fut', 'inf_pess'];

export const TENSE_NAMES: Record<Tense, string> = {
  pres: 'Presente',
  perf: 'Pretérito perfeito',
  imperf: 'Imperfeito',
  mqp_comp: 'Mais-que-perfeito composto',
  fut_ir: 'Future with ir',
  fut: 'Futuro simples',
  cond: 'Futuro do pretérito',
  prog: 'Estar + gerúndio',
  perf_comp: 'Pretérito perfeito composto',
  imp: 'Imperativo',
  subj_pres: 'Presente do subjuntivo',
  subj_imperf: 'Imperfeito do subjuntivo',
  subj_fut: 'Futuro do subjuntivo',
  inf_pess: 'Infinitivo pessoal',
};

const ALL_SLOTS: Slot[] = ['eu', 'tu', 'ele', 'nos', 'eles'];

export const REQUIRED_SLOTS: Record<Tense, Slot[]> = Object.fromEntries(
  TENSES.map((t) => [t, t === 'imp' ? ['ele', 'nos', 'eles'] : ALL_SLOTS]),
) as Record<Tense, Slot[]>;

export const PROMPT_SLOT: Record<Prompt, Slot> = {
  eu: 'eu',
  tu: 'tu',
  você: 'ele',
  'a gente': 'ele',
  nós: 'nos',
  vocês: 'eles',
};

export const PROMPT_PRONOUNS: Record<Prompt, string[]> = {
  eu: ['eu'],
  tu: ['tu'],
  você: ['você', 'ele', 'ela'],
  'a gente': ['a gente'],
  nós: ['nós'],
  vocês: ['vocês', 'eles', 'elas'],
};

export function promptsFor(tense: Tense, tu: boolean): Prompt[] {
  if (tense === 'imp') return ['você', 'nós', 'vocês'];
  const base: Prompt[] = ['eu', 'você', 'a gente', 'nós', 'vocês'];
  return tu ? ['eu', 'tu', 'você', 'a gente', 'nós', 'vocês'] : base;
}

export function alternates(form: string): string[] {
  return form.split('|');
}
