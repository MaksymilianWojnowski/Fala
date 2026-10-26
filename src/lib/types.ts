import type { Card } from 'ts-fsrs';

export type Tense = 'pres' | 'perf' | 'imperf' | 'mqp_comp' | 'fut_ir' | 'fut' | 'cond' | 'prog' | 'perf_comp' | 'imp' | 'subj_pres' | 'subj_imperf' | 'subj_fut' | 'inf_pess';
export type Slot = 'eu' | 'tu' | 'ele' | 'nos' | 'eles';
export type Prompt = 'eu' | 'tu' | 'você' | 'a gente' | 'nós' | 'vocês';
export type Rating = 1 | 2 | 3 | 4;

export interface Verb {
  lemma: string;
  en: string;
  rank: number;
  participle: string;
  gerund: string;
  forms: Record<Tense, Partial<Record<Slot, string>>>;
  irregular: string[]; // irregular: 'perf.eu', 'participle'
}

export interface Sentence {
  id: number;
  pt: string;
  en: string;
  author: string;
  gap: { start: number; end: number; lemma: string; tense: Tense; slot: Slot };
  alt?: string[];
  why?: string;
}

export interface Unit {
  id: string;
  stage: 1 | 2 | 3 | 4;
  name: string;
  example: string;
  tags: ('spoken' | 'written')[];
  tenses: Tense[];
  filter?: 'regular' | 'irregular';
}

export interface CardState {
  id: string;
  fsrs: Card;
  updatedAt: number;
  passes: number;
  introduced: string;
  suspended?: boolean;
  prompts?: Partial<Record<Prompt, [ok: number, total: number]>>;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  at: number;
  rating: Rating;
  answer?: string;
  device: string;
}

export interface Settings {
  minutes: 5 | 10 | 20;
  newPerDay: number;
  tu: boolean;
  strictAccents: boolean;
  accentCombos: boolean;
  voice?: string;
  theme: 'system' | 'light' | 'dark';
  streak: boolean;
  syncCode?: string;
  updatedAt: number;
}

export interface UnitState {
  id: string;
  status: 'new' | 'learning' | 'known';
  updatedAt: number;
}

export interface Snapshot {
  cards: CardState[];
  logs: ReviewLog[];
  units: UnitState[];
  settings: Settings;
}

export interface Store {
  cards(): Promise<Map<string, CardState>>;
  putCard(c: CardState): Promise<void>;
  logs(): Promise<ReviewLog[]>;
  addLog(l: ReviewLog): Promise<void>;
  units(): Promise<Map<string, UnitState>>;
  putUnit(u: UnitState): Promise<void>;
  settings(): Promise<Settings>;
  putSettings(s: Settings): Promise<void>;
  device(): Promise<string>;
  snapshot(): Promise<Snapshot>;
  applyRemote(s: Snapshot): Promise<void>;
}

export type Item =
  | { kind: 'conjugate'; cardId: string; lemma: string; tense: Tense; prompt: Prompt; pronoun: string }
  | { kind: 'gap'; cardId: string; sentence: Sentence; hint: 'tense' | 'context' | 'audio' }
  | { kind: 'translate'; cardId: string; sentence: Sentence };
