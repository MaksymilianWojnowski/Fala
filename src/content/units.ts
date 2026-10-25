import type { Unit } from '../lib/types';

export const STAGE_NAMES = ['Core', 'Past', 'Moods', 'Advanced'];

export const UNITS: Unit[] = [
  { id: 'pres_reg', stage: 1, name: 'Presente · regular', example: 'eu falo, como, parto', tags: [], tenses: ['pres'], filter: 'regular' },
  { id: 'pres_irr', stage: 1, name: 'Presente · irregular', example: 'eu sou, tenho, vou, faço', tags: [], tenses: ['pres'], filter: 'irregular' },
  { id: 'fut_ir', stage: 1, name: 'Future with ir', example: 'eu vou falar', tags: ['spoken'], tenses: ['fut_ir'] },
  { id: 'prog', stage: 1, name: 'Estar + gerúndio', example: 'estou falando', tags: [], tenses: ['prog'] },
  { id: 'perf', stage: 2, name: 'Pretérito perfeito', example: 'eu falei, comi, parti', tags: [], tenses: ['perf'] },
  { id: 'imperf', stage: 2, name: 'Imperfeito', example: 'eu falava, comia, partia', tags: [], tenses: ['imperf'] },
  { id: 'perf_vs_imperf', stage: 2, name: 'Perfeito vs. imperfeito', example: 'falei or falava?', tags: [], tenses: ['perf', 'imperf'] },
  { id: 'mqp_comp', stage: 2, name: 'Mais-que-perfeito composto', example: 'eu tinha falado', tags: ['spoken'], tenses: ['mqp_comp'] },
  { id: 'imp', stage: 3, name: 'Imperativo', example: 'fala! · fale!', tags: [], tenses: ['imp'] },
  { id: 'cond', stage: 3, name: 'Futuro do pretérito', example: 'eu falaria', tags: [], tenses: ['cond'] },
  { id: 'subj_pres', stage: 3, name: 'Presente do subjuntivo', example: 'que eu fale', tags: [], tenses: ['subj_pres'] },
  { id: 'subj_imperf', stage: 4, name: 'Imperfeito do subjuntivo', example: 'se eu falasse', tags: [], tenses: ['subj_imperf'] },
  { id: 'subj_fut', stage: 4, name: 'Futuro do subjuntivo', example: 'quando eu falar', tags: [], tenses: ['subj_fut'] },
  { id: 'perf_comp', stage: 4, name: 'Pretérito perfeito composto', example: 'eu tenho falado', tags: [], tenses: ['perf_comp'] },
  { id: 'fut', stage: 4, name: 'Futuro simples', example: 'eu falarei', tags: ['written'], tenses: ['fut'] },
  { id: 'inf_pess', stage: 4, name: 'Infinitivo pessoal', example: 'para nós falarmos', tags: [], tenses: ['inf_pess'] },
];
