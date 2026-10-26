type VoiceLike = Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'localService'>;

const isBr = (v: VoiceLike) => /^pt[-_]br$/i.test(v.lang);

// Never pt-PT: a European voice reads Brazilian text wrongly.
export function pickVoice<V extends VoiceLike>(voices: V[], preferred?: string): V | undefined {
  const br = voices.filter(isBr);
  return br.find((v) => v.name === preferred) ?? br.find((v) => v.localService) ?? br[0];
}

let voices: Promise<SpeechSynthesisVoice[]> | undefined;

// Cached like loadVerbs, so Today, Session and Learn share one wait instead of each paying it.
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  voices ??= waitForVoices(timeoutMs);
  return voices;
}

// Chrome and Firefox fill the voice list late, so wait for voiceschanged, but never past the timeout.
function waitForVoices(timeoutMs: number): Promise<SpeechSynthesisVoice[]> {
  const synth = globalThis.speechSynthesis;
  if (!synth) return Promise.resolve([]);
  const ready = synth.getVoices();
  if (ready.length) return Promise.resolve(ready);
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      synth.removeEventListener('voiceschanged', done);
      resolve(synth.getVoices());
    };
    const timer = setTimeout(done, timeoutMs);
    synth.addEventListener('voiceschanged', done);
  });
}

// cancel() first so a second tap doesn't queue behind the first sentence.
export function speak(text: string, voice: SpeechSynthesisVoice): void {
  const synth = globalThis.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = 'pt-BR';
  u.rate = 0.95;
  synth.speak(u);
}
