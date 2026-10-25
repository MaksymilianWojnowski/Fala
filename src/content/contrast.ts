import type { Sentence, Slot, Tense } from '../lib/types';

// Gap form must appear verbatim in pt; start/end are derived, never hand-counted.
function s(id: number, pt: string, form: string, lemma: string, tense: Tense, slot: Slot, en: string, why: string): Sentence {
  const start = pt.indexOf(form);
  if (start < 0) throw new Error(`"${form}" not found in "${pt}"`);
  return { id, pt, en, author: 'Fala', gap: { start, end: start + form.length, lemma, tense, slot }, why };
}

export const CONTRAST: Sentence[] = [
  // perfeito vs imperfeito
  s(-1, 'Ontem eu falei com a minha mãe.', 'falei', 'falar', 'perf', 'eu', 'Yesterday I talked to my mom.', 'A finished action at a clear time: ontem.'),
  s(-2, 'Ontem ele comeu tudo no almoço.', 'comeu', 'comer', 'perf', 'ele', 'Yesterday he ate everything at lunch.', 'Ontem marks one finished event: perfeito.'),
  s(-3, 'Nós chegamos tarde na festa.', 'chegamos', 'chegar', 'perf', 'nos', 'We arrived late to the party.', 'A single finished event at a point in time.'),
  s(-4, 'Eles venderam o carro semana passada.', 'venderam', 'vender', 'perf', 'eles', 'They sold the car last week.', 'A finished event with a time marker: semana passada.'),
  s(-5, 'Eu fui ao mercado ontem.', 'fui', 'ir', 'perf', 'eu', 'I went to the market yesterday.', 'Irregular perfeito: fui, foi, fomos, foram.'),
  s(-6, 'Ele não pôde ir à festa naquele dia.', 'pôde', 'poder', 'perf', 'ele', "He couldn't go to the party that day.", 'Naquele dia marks one finished event: perfeito.'),
  s(-7, 'Nós fizemos a lição ontem à noite.', 'fizemos', 'fazer', 'perf', 'nos', 'We did the homework last night.', 'Fazer is irregular in the perfeito: fiz, fez, fizemos.'),
  s(-8, 'De repente, eles disseram a verdade.', 'disseram', 'dizer', 'perf', 'eles', 'Suddenly, they told the truth.', 'De repente marks one sudden, finished act: perfeito.'),
  s(-9, 'Eu li o livro em uma semana.', 'li', 'ler', 'perf', 'eu', 'I read the book in a week.', 'A completed action with a span of time: em uma semana.'),
  s(-10, 'Ela perdeu o ônibus de manhã.', 'perdeu', 'perder', 'perf', 'ele', 'She missed the bus this morning.', 'One finished event at a point in time: de manhã.'),
  s(-11, 'Quando eu era criança, eu morava em Recife.', 'era', 'ser', 'imperf', 'eu', 'When I was a kid, I lived in Recife.', 'Background description, so imperfeito: era.'),
  s(-12, 'Todo dia ela comia pão no café.', 'comia', 'comer', 'imperf', 'ele', 'Every day she ate bread at breakfast.', 'A habit that repeated, so imperfeito.'),
  s(-13, 'Enquanto eu trabalhava, ela dormia.', 'trabalhava', 'trabalhar', 'imperf', 'eu', 'While I was working, she was sleeping.', 'An ongoing action in the past with no clear end.'),
  s(-14, 'Naquela época, nós jogávamos bola todo sábado.', 'jogávamos', 'jogar', 'imperf', 'nos', 'Back then, we played ball every Saturday.', 'A repeated habit in the past.'),
  s(-15, 'Eles sempre ouviam rádio no carro.', 'ouviam', 'ouvir', 'imperf', 'eles', 'They always listened to the radio in the car.', 'A repeated habit, so imperfeito.'),
  s(-16, 'Todo dia ele estava cansado depois do treino.', 'estava', 'estar', 'imperf', 'ele', 'Every day he was tired after training.', 'Todo dia marks a repeated state in the past: imperfeito.'),
  s(-17, 'Eu tinha dez anos quando nos mudamos.', 'tinha', 'ter', 'imperf', 'eu', 'I was ten when we moved.', 'Background age in the past: imperfeito.'),
  s(-18, 'Ela tomava café com leite todo dia.', 'tomava', 'tomar', 'imperf', 'ele', 'She had coffee with milk every day.', 'A habit, so imperfeito.'),
  s(-19, 'Quando era pequeno, ele falava muito.', 'era', 'ser', 'imperf', 'ele', 'When he was little, he talked a lot.', 'A description of the past, so imperfeito.'),
  s(-20, 'Os meninos sempre saíam da escola às cinco.', 'saíam', 'sair', 'imperf', 'eles', 'The kids always used to leave school at five.', 'Sempre marks a regular routine in the past: imperfeito.'),

  // presente do subjuntivo: após que / espero que / talvez
  s(-21, 'Espero que você tenha um bom dia.', 'tenha', 'ter', 'subj_pres', 'ele', 'I hope you have a good day.', 'After espero que, the verb takes the subjuntivo.'),
  s(-22, 'Talvez ele vá ao cinema hoje.', 'vá', 'ir', 'subj_pres', 'ele', 'Maybe he will go to the movies today.', 'Talvez takes the subjuntivo.'),
  s(-23, 'Quero que a gente faça a lição agora.', 'faça', 'fazer', 'subj_pres', 'ele', 'I want us to do the homework now.', 'After quero que, the verb takes the subjuntivo.'),
  s(-24, 'Espero que nós possamos ir juntos.', 'possamos', 'poder', 'subj_pres', 'nos', 'I hope we can go together.', 'Poder in the subjuntivo: possamos after espero que.'),
  s(-25, 'Talvez eles cheguem atrasados.', 'cheguem', 'chegar', 'subj_pres', 'eles', 'They might arrive late.', 'Talvez takes the subjuntivo, even for the future.'),
  s(-26, 'Espero que você entenda a pergunta.', 'entenda', 'entender', 'subj_pres', 'ele', 'I hope you understand the question.', 'After espero que, the -er verb takes -a.'),
  s(-27, 'Talvez eu saia mais cedo.', 'saia', 'sair', 'subj_pres', 'eu', 'Maybe I will leave earlier.', 'Talvez plus the subjuntivo.'),
  s(-28, 'Eu quero que eles paguem a conta.', 'paguem', 'pagar', 'subj_pres', 'eles', 'I want them to pay the bill.', 'After quero que, the verb is subjuntivo.'),
  s(-29, 'Espero que ela venha à festa.', 'venha', 'vir', 'subj_pres', 'ele', 'I hope she comes to the party.', 'After espero que, the subjuntivo of vir is venha.'),
  s(-30, 'Talvez a gente diga a verdade depois.', 'diga', 'dizer', 'subj_pres', 'ele', 'Maybe we will tell the truth later.', 'Talvez plus the subjuntivo: diga.'),

  // imperfeito do subjuntivo: se … , eu …ria
  s(-31, 'Se eu tivesse dinheiro, eu compraria um carro.', 'tivesse', 'ter', 'subj_imperf', 'eu', "If I had money, I'd buy a car.", 'After se, the imperfeito do subjuntivo; the result is -ria.'),
  s(-32, 'Se ele fosse rico, eu pediria um empréstimo.', 'fosse', 'ser', 'subj_imperf', 'ele', "If he were rich, I'd ask for a loan.", 'After se, the imperfeito do subjuntivo: fosse.'),
  s(-33, 'Se nós soubéssemos, eu avisaria todo mundo.', 'soubéssemos', 'saber', 'subj_imperf', 'nos', "If we knew, I'd tell everyone.", 'After se, nós takes -éssemos.'),
  s(-34, 'Se eu pudesse, eu ficaria mais um dia.', 'pudesse', 'poder', 'subj_imperf', 'eu', "If I could, I'd stay one more day.", 'After se, poder becomes pudesse.'),
  s(-35, 'Se ele soubesse a verdade, eu ficaria com vergonha.', 'soubesse', 'saber', 'subj_imperf', 'ele', "If he knew the truth, I'd be ashamed.", 'After se, the imperfeito do subjuntivo: soubesse.'),
  s(-36, 'Se eles viessem cedo, eu jantaria com eles.', 'viessem', 'vir', 'subj_imperf', 'eles', "If they came early, I'd have dinner with them.", 'After se, the plural is -essem.'),
  s(-37, 'Se eu dissesse isso, ela ficaria triste.', 'dissesse', 'dizer', 'subj_imperf', 'eu', "If I said that, she'd be sad.", 'After se, dizer becomes dissesse.'),
  s(-38, 'Se ela lesse mais, eu ficaria feliz.', 'lesse', 'ler', 'subj_imperf', 'ele', "If she read more, I'd be happy.", 'After se, the -er verb takes -esse.'),
  s(-39, 'Se eles tivessem tempo, eu ajudaria.', 'tivessem', 'ter', 'subj_imperf', 'eles', "If they had time, I'd help.", 'After se, ter becomes tivessem for eles.'),
  s(-40, 'Se eu fosse você, eu aceitaria a proposta.', 'fosse', 'ser', 'subj_imperf', 'eu', "If I were you, I'd accept the offer.", 'Advice with se: se eu fosse você.'),

  // futuro do subjuntivo: após quando / se
  s(-41, 'Quando eu chegar, eu te ligo.', 'chegar', 'chegar', 'subj_fut', 'eu', "When I get there, I'll call you.", 'After quando, a future event uses the future subjuntivo.'),
  s(-42, 'Se ele vier amanhã, a gente almoça junto.', 'vier', 'vir', 'subj_fut', 'ele', "If he comes tomorrow, we'll have lunch together.", 'After se, a possible future event.'),
  s(-43, 'Quando eles terminarem, a gente começa.', 'terminarem', 'terminar', 'subj_fut', 'eles', "When they finish, we'll start.", 'After quando, eles takes -em.'),
  s(-44, 'Se eu puder, eu passo aí.', 'puder', 'poder', 'subj_fut', 'eu', "If I can, I'll stop by.", 'After se, poder becomes puder.'),
  s(-45, 'Quando nós tivermos tempo, a gente viaja.', 'tivermos', 'ter', 'subj_fut', 'nos', "When we have time, we'll travel.", 'After quando, nós takes -ermos.'),
  s(-46, 'Se você fizer isso, eu fico feliz.', 'fizer', 'fazer', 'subj_fut', 'ele', "If you do that, I'll be happy.", 'After se, fazer becomes fizer.'),
  s(-47, 'Quando a gente souber, a gente te avisa.', 'souber', 'saber', 'subj_fut', 'ele', "When we know, we'll let you know.", 'After quando, a future event uses the future subjuntivo: souber.'),
  s(-48, 'Se eles quiserem, eles vêm à festa.', 'quiserem', 'querer', 'subj_fut', 'eles', "If they want to, they'll come to the party.", 'After se, the plural of querer is quiserem.'),
  s(-49, 'Quando eu acabar o trabalho, eu te ligo.', 'acabar', 'acabar', 'subj_fut', 'eu', "When I finish work, I'll call you.", 'After quando, the -ar verb keeps its infinitive form for eu.'),
  s(-50, 'Se você vir o Pedro, dá um oi pra ele.', 'vir', 'ver', 'subj_fut', 'ele', 'If you see Pedro, say hi to him.', 'Ver becomes vir in the future subjuntivo.'),
];
