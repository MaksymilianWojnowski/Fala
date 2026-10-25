export interface Learn {
  summary: string;
  uses: { title: string; pt: string; en: string }[];
  signals: string[];
  irregulars: { verb: string; label?: string; forms: string }[];
  examples: { pt: string; en: string }[];
  note?: string;
  why: string;
}

export const LEARN: Record<string, Learn> = {
  pres_reg: {
    summary: 'Regular verbs drop -ar, -er or -ir and add the ending for each person. Most verbs follow this pattern.',
    uses: [
      { title: 'Habits and routines', pt: 'Eu trabalho de manhã.', en: 'I work in the morning.' },
      { title: 'Facts about someone', pt: 'Ela fala inglês e espanhol.', en: 'She speaks English and Spanish.' },
      { title: 'Things true right now', pt: 'Eu entendo o problema.', en: 'I understand the problem.' },
    ],
    signals: ['sempre', 'todo dia', 'às vezes', 'geralmente', 'normalmente'],
    irregulars: [],
    examples: [
      { pt: 'Eu bebo água todo dia.', en: 'I drink water every day.' },
      { pt: 'A gente come arroz e feijão no almoço.', en: 'We eat rice and beans at lunch.' },
      { pt: 'Vocês compram pão na padaria?', en: 'Do you buy bread at the bakery?' },
      { pt: 'Ele mora perto do trabalho.', en: 'He lives close to work.' },
      { pt: 'Ela abre a loja às oito.', en: 'She opens the shop at eight.' },
    ],
    why: 'Regular verbs follow one ending for each person, so learn the endings once.',
  },

  pres_irr: {
    summary: 'Some of the most common verbs break the pattern. Learn these by heart, because you use them every day.',
    uses: [
      { title: 'Who or what something is', pt: 'Eu sou de São Paulo e estou em Recife.', en: "I'm from São Paulo and I'm in Recife." },
      { title: 'Having and going', pt: 'Eu tenho um irmão e vou à praia no domingo.', en: 'I have a brother and I go to the beach on Sunday.' },
      { title: 'Doing', pt: 'Ela faz café todo dia de manhã.', en: 'She makes coffee every morning.' },
    ],
    signals: ['agora', 'hoje', 'todo dia', 'sempre'],
    irregulars: [
      { verb: 'ser', forms: 'sou, é, somos, são' },
      { verb: 'ir', forms: 'vou, vai, vamos, vão' },
      { verb: 'ter', forms: 'tenho, tem, temos, têm' },
      { verb: 'fazer', forms: 'faço, faz, fazemos, fazem' },
      { verb: 'estar', forms: 'estou, está, estamos, estão' },
    ],
    examples: [
      { pt: 'Eu sou de São Paulo.', en: "I'm from São Paulo." },
      { pt: 'Ela tem dois filhos.', en: 'She has two kids.' },
      { pt: 'Nós vamos ao cinema hoje.', en: "We're going to the movies today." },
      { pt: 'Você faz almoço hoje?', en: 'Are you making lunch today?' },
      { pt: 'Eles estão em casa.', en: "They're at home." },
    ],
    why: 'These verbs break the pattern, so learn each form by heart.',
  },

  fut_ir: {
    summary: 'Use ir in the present plus an infinitive for plans and the near future. It is the everyday way to talk about the future in spoken Brazilian Portuguese.',
    uses: [
      { title: 'Plans', pt: 'Eu vou falar com ela amanhã.', en: "I'm going to talk to her tomorrow." },
      { title: 'Predictions from what you see', pt: 'Vai chover logo, olha as nuvens.', en: "It's going to rain soon, look at the clouds." },
      { title: 'Invitations', pt: 'A gente vai jantar fora hoje?', en: 'Shall we go out for dinner tonight?' },
    ],
    signals: ['amanhã', 'logo', 'mais tarde', 'depois', 'semana que vem'],
    irregulars: [{ verb: 'ir', forms: 'vou, vai, vamos, vão' }],
    examples: [
      { pt: 'Eu vou ligar para você depois.', en: "I'll call you later." },
      { pt: 'Ela vai chegar às oito.', en: "She's going to arrive at eight." },
      { pt: 'Nós vamos comprar um carro mês que vem.', en: "We're going to buy a car next month." },
      { pt: 'Vocês vão gostar do filme.', en: "You're going to like the movie." },
      { pt: 'Vai dar tudo certo.', en: "Everything's going to be fine." },
    ],
    why: 'Ir plus an infinitive is the everyday future in speech; the simple future is for writing.',
  },

  prog: {
    summary: 'Estar plus a gerund shows an action in progress right now. Use it for what is happening at this moment.',
    uses: [
      { title: 'Happening right now', pt: 'Eu estou estudando agora.', en: "I'm studying right now." },
      { title: 'In progress when something else happened', pt: 'Quando eu cheguei, ela estava dormindo.', en: 'When I got there, she was sleeping.' },
      { title: 'Going on for a while', pt: 'Ele está trabalhando de casa esta semana.', en: "He's working from home this week." },
    ],
    signals: ['agora', 'neste momento', 'ainda', 'esta semana'],
    irregulars: [
      { verb: 'estar', forms: 'estou, está, estamos, estão' },
      { verb: 'ir', forms: 'indo' },
    ],
    examples: [
      { pt: 'Eu estou lendo um livro.', en: "I'm reading a book." },
      { pt: 'Ela está cozinhando agora.', en: "She's cooking right now." },
      { pt: 'A gente está esperando o ônibus.', en: "We're waiting for the bus." },
      { pt: 'Vocês estão fazendo muito barulho.', en: "You're making a lot of noise." },
      { pt: 'Eles estão dormindo agora.', en: "They're asleep right now." },
    ],
    why: 'Estar plus gerund is for an action happening now; a plain present is fine for most things.',
  },

  perf: {
    summary: 'Finished actions at a point in the past. Usually the English simple past: I spoke, she ate.',
    uses: [
      { title: 'A finished action', pt: 'Ontem eu comi feijoada.', en: 'Yesterday I ate feijoada.' },
      { title: 'A chain of events', pt: 'Cheguei, tomei banho e dormi.', en: 'I got home, showered and slept.' },
      { title: 'Once, at a known time', pt: 'A gente se conheceu em 2019.', en: 'We met in 2019.' },
    ],
    signals: ['ontem', 'semana passada', 'no sábado', 'de repente', 'já'],
    irregulars: [
      { verb: 'ser', label: 'ser / ir', forms: 'fui, foi, fomos, foram' },
      { verb: 'ter', forms: 'tive, teve, tivemos, tiveram' },
      { verb: 'estar', forms: 'estive, esteve, estivemos, estiveram' },
      { verb: 'fazer', forms: 'fiz, fez, fizemos, fizeram' },
      { verb: 'poder', forms: 'pude, pôde, pudemos, puderam' },
    ],
    examples: [
      { pt: 'Eu fui ao mercado ontem.', en: 'I went to the market yesterday.' },
      { pt: 'Ela falou com o chefe na segunda.', en: 'She talked to the boss on Monday.' },
      { pt: 'Eles comeram pizza no sábado.', en: 'They ate pizza on Saturday.' },
      { pt: 'Nós partimos cedo, às cinco da manhã.', en: 'We left early, at five in the morning.' },
      { pt: 'Eu não pude ir à festa.', en: "I couldn't go to the party." },
    ],
    note: 'Watch out: nós falamos looks the same in presente and perfeito. Context tells them apart.',
    why: 'Use it for a finished action with a clear time, like ontem or no sábado.',
  },

  imperf: {
    summary: "Ongoing or repeated actions in the past, with no clear end. Usually the English 'used to' or 'was -ing': I was speaking, she used to eat.",
    uses: [
      { title: 'Habits in the past', pt: 'Antigamente eu jogava futebol todo fim de semana.', en: 'I used to play football every weekend.' },
      { title: 'Background description', pt: 'Estava chovendo e fazia frio.', en: 'It was raining and it was cold.' },
      { title: 'Ongoing action', pt: 'Quando eu era criança, eu morava em Belo Horizonte.', en: 'When I was a kid, I lived in Belo Horizonte.' },
    ],
    signals: ['sempre', 'todo dia', 'antigamente', 'naquela época', 'enquanto'],
    irregulars: [
      { verb: 'ser', forms: 'era, era, éramos, eram' },
      { verb: 'ter', forms: 'tinha, tinha, tínhamos, tinham' },
      { verb: 'vir', forms: 'vinha, vinha, vínhamos, vinham' },
      { verb: 'pôr', forms: 'punha, punha, púnhamos, punham' },
    ],
    examples: [
      { pt: 'Quando eu era criança, eu morava em Belo Horizonte.', en: 'When I was a kid, I lived in Belo Horizonte.' },
      { pt: 'Ela sempre tomava café com leite.', en: 'She always had coffee with milk.' },
      { pt: 'Enquanto a gente esperava, chovia muito.', en: 'While we waited, it was raining hard.' },
      { pt: 'Nós íamos à praia todo verão.', en: 'We used to go to the beach every summer.' },
      { pt: 'Eles tinham muitos amigos na escola.', en: 'They had a lot of friends at school.' },
    ],
    why: 'Use it for habits, background and actions that were going on, not for a single finished event.',
  },

  perf_vs_imperf: {
    summary: 'Same past, two views. The perfeito is the event: one finished action. The imperfeito is the scene: what was going on, or what used to happen.',
    uses: [
      { title: 'Event against background', pt: 'Quando eu cheguei, estava chovendo.', en: 'When I arrived, it was raining.' },
      { title: 'Interrupted action', pt: 'Eu estava dormindo quando o telefone tocou.', en: 'I was sleeping when the phone rang.' },
      { title: 'A habit, then one change', pt: 'Eu morava no Rio, e em 2019 eu me mudei para São Paulo.', en: 'I lived in Rio, and in 2019 I moved to São Paulo.' },
    ],
    signals: ['quando', 'enquanto', 'de repente', 'sempre', 'ontem'],
    irregulars: [],
    examples: [
      { pt: 'Ontem estava frio, mas eu saí de casa.', en: 'It was cold yesterday, but I went out.' },
      { pt: 'Enquanto eles jantavam, a luz caiu.', en: 'While they were having dinner, the lights went out.' },
      { pt: 'Ela estudava de noite e trabalhava de dia.', en: 'She studied at night and worked during the day.' },
      { pt: 'De repente, ele se levantou e foi embora.', en: 'Suddenly, he stood up and left.' },
      { pt: 'Eu morava em Curitiba quando minha filha nasceu.', en: 'I was living in Curitiba when my daughter was born.' },
    ],
    why: 'Ask whether the verb is the event (perfeito) or the scene around it (imperfeito).',
  },

  mqp_comp: {
    summary: 'The pluperfect: something finished before another past event. Formed with tinha or tinham plus the past participle.',
    uses: [
      { title: 'Before another past event', pt: 'Quando eu cheguei, ela já tinha saído.', en: 'When I arrived, she had already left.' },
      { title: 'Explaining a result', pt: 'Eu não consegui entrar porque tinha esquecido a chave.', en: "I couldn't get in because I had forgotten my key." },
      { title: 'Earlier past in a story', pt: 'Eles tinham comido antes de a gente chegar.', en: 'They had eaten before we arrived.' },
    ],
    signals: ['já', 'antes', 'até então', 'quando', 'porque'],
    irregulars: [
      { verb: 'fazer', forms: 'feito' },
      { verb: 'dizer', forms: 'dito' },
      { verb: 'ver', forms: 'visto' },
      { verb: 'pôr', forms: 'posto' },
    ],
    examples: [
      { pt: 'Eu já tinha comido quando você ligou.', en: 'I had already eaten when you called.' },
      { pt: 'Ela tinha saído antes da reunião começar.', en: 'She had left before the meeting started.' },
      { pt: 'Nós tínhamos visto o filme, então não fomos.', en: "We had seen the movie, so we didn't go." },
      { pt: 'Eles tinham feito a lição, mas esqueceram em casa.', en: 'They had done the homework but left it at home.' },
      { pt: 'Quando eu cheguei, o jogo já tinha começado.', en: 'When I got there, the game had already started.' },
    ],
    why: 'Use it for the earlier of two past events: tinha plus the participle.',
  },

  imp: {
    summary: 'Commands and instructions. With você, nós and vocês the form is the same as the present subjuntivo: fale, falemos, falem.',
    uses: [
      { title: 'Instructions', pt: 'Fale mais devagar, por favor.', en: 'Please speak more slowly.' },
      { title: 'A suggestion with nós', pt: 'Vamos comer fora hoje?', en: 'Shall we eat out tonight?' },
      { title: 'An order to a group', pt: 'Sentem, por favor, e esperem aqui.', en: 'Please sit down and wait here.' },
    ],
    signals: ['por favor', 'agora', 'com calma', 'vamos'],
    irregulars: [
      { verb: 'ser', forms: 'seja, sejamos, sejam' },
      { verb: 'ir', forms: 'vá, vamos, vão' },
      { verb: 'dar', forms: 'dê, demos, deem' },
      { verb: 'ter', forms: 'tenha, tenhamos, tenham' },
      { verb: 'fazer', forms: 'faça, façamos, façam' },
    ],
    examples: [
      { pt: 'Fale mais alto, por favor.', en: 'Speak up, please.' },
      { pt: 'Espere aqui um minutinho.', en: 'Wait here a moment.' },
      { pt: 'Vá com calma, a estrada está molhada.', en: 'Take it easy, the road is wet.' },
      { pt: 'Façam o dever de casa antes do jantar.', en: 'Do your homework before dinner.' },
      { pt: 'Não fale tão alto.', en: "Don't talk so loud." },
    ],
    note: 'For a negative command use the subjuntivo: não fale, não coma. In casual speech you also hear fala! and come! for você.',
    why: 'Commands use the subjuntivo forms: fale, falemos, falem.',
  },

  cond: {
    summary: "The conditional: what would happen, or a polite request. Usually the English 'would' plus a verb.",
    uses: [
      { title: 'A result that depends on something', pt: 'Eu compraria uma casa na praia.', en: 'I would buy a house on the beach.' },
      { title: 'A polite request', pt: 'Você poderia repetir, por favor?', en: 'Could you repeat that, please?' },
      { title: 'Reported future', pt: 'Ela disse que viria amanhã.', en: 'She said she would come tomorrow.' },
    ],
    signals: ['se', 'gostaria', 'poderia', 'talvez', 'seria bom'],
    irregulars: [
      { verb: 'fazer', forms: 'faria, faria, faríamos, fariam' },
      { verb: 'dizer', forms: 'diria, diria, diríamos, diriam' },
      { verb: 'trazer', forms: 'traria, traria, traríamos, trariam' },
    ],
    examples: [
      { pt: 'Eu gostaria de um café, por favor.', en: "I'd like a coffee, please." },
      { pt: 'Se eu pudesse, eu viajaria mais.', en: "If I could, I'd travel more." },
      { pt: 'Vocês fariam isso por mim?', en: 'Would you do that for me?' },
      { pt: 'Ela teria tempo amanhã, eu acho.', en: 'I think she would have time tomorrow.' },
      { pt: 'Seria ótimo se você viesse.', en: 'It would be great if you came.' },
    ],
    why: 'Use it for a result that depends on something else, or for a polite request.',
  },

  subj_pres: {
    summary: 'The present subjuntivo follows que, espero que and talvez when the speaker wants, hopes or doubts something. For -ar verbs the ending is -e (fale); for -er and -ir verbs it is -a (coma, parta).',
    uses: [
      { title: 'After quero que', pt: 'Eu quero que você fale mais.', en: 'I want you to speak more.' },
      { title: 'After espero que', pt: 'Espero que ele chegue cedo.', en: 'I hope he arrives early.' },
      { title: 'After talvez', pt: 'Talvez ela venha amanhã.', en: 'Maybe she will come tomorrow.' },
    ],
    signals: ['que', 'espero que', 'talvez', 'quero que', 'é possível que'],
    irregulars: [
      { verb: 'ser', forms: 'seja, seja, sejamos, sejam' },
      { verb: 'ir', forms: 'vá, vá, vamos, vão' },
      { verb: 'ter', forms: 'tenha, tenha, tenhamos, tenham' },
      { verb: 'dar', forms: 'dê, dê, demos, deem' },
      { verb: 'ver', forms: 'veja, veja, vejamos, vejam' },
    ],
    examples: [
      { pt: 'Espero que você tenha um bom dia.', en: 'I hope you have a good day.' },
      { pt: 'Talvez a gente vá ao cinema hoje.', en: "Maybe we'll go to the movies today." },
      { pt: 'Quero que eles façam a lição agora.', en: 'I want them to do the homework now.' },
      { pt: 'É possível que ela chegue atrasada.', en: 'She might arrive late.' },
      { pt: 'Espero que nós possamos ir juntos.', en: 'I hope we can go together.' },
    ],
    why: 'After que, espero que and talvez, the verb usually takes the subjuntivo.',
  },

  subj_imperf: {
    summary: 'The imperfect subjuntivo sits in the if-clause (se) for unreal or unlikely situations. The result clause uses the -ria conditional: se eu tivesse, eu compraria.',
    uses: [
      { title: 'An imagined situation', pt: 'Se eu tivesse dinheiro, eu compraria um carro.', en: "If I had money, I'd buy a car." },
      { title: 'Something unlikely', pt: 'Se ela soubesse, ficaria triste.', en: "If she knew, she'd be sad." },
      { title: 'Advice', pt: 'Se eu fosse você, eu aceitaria a proposta.', en: "If I were you, I'd accept the offer." },
    ],
    signals: ['se', 'caso', 'se eu fosse você', 'se eu pudesse'],
    irregulars: [
      { verb: 'ser', forms: 'fosse, fosse, fôssemos, fossem' },
      { verb: 'ter', forms: 'tivesse, tivesse, tivéssemos, tivessem' },
      { verb: 'fazer', forms: 'fizesse, fizesse, fizéssemos, fizessem' },
      { verb: 'dizer', forms: 'dissesse, dissesse, disséssemos, dissessem' },
      { verb: 'ver', forms: 'visse, visse, víssemos, vissem' },
    ],
    examples: [
      { pt: 'Se eu tivesse tempo, eu ajudaria.', en: "If I had time, I'd help." },
      { pt: 'Se você viesse mais cedo, a gente almoçaria junto.', en: "If you came earlier, we'd have lunch together." },
      { pt: 'Se ela soubesse disso, ficaria chateada.', en: "If she knew that, she'd be upset." },
      { pt: 'Se eu fosse você, eu aceitaria a proposta.', en: "If I were you, I'd accept the offer." },
      { pt: 'Se nós pudéssemos, nós viajaríamos mais.', en: "If we could, we'd travel more." },
    ],
    why: 'After se, use the imperfect subjuntivo, and the result takes the -ria conditional.',
  },

  subj_fut: {
    summary: 'The future subjuntivo follows quando, se and assim que for something still ahead. For regular verbs the eu and ele forms look like the infinitive: quando eu falar, quando ela partir.',
    uses: [
      { title: 'After quando', pt: 'Quando eu chegar, eu te ligo.', en: "When I get there, I'll call you." },
      { title: 'After se', pt: 'Se ele vier amanhã, a gente almoça junto.', en: "If he comes tomorrow, we'll have lunch together." },
      { title: 'After assim que', pt: 'Assim que você souber, me avisa.', en: 'As soon as you know, let me know.' },
    ],
    signals: ['quando', 'se', 'assim que', 'logo que'],
    irregulars: [
      { verb: 'ser', forms: 'for, for, formos, forem' },
      { verb: 'ter', forms: 'tiver, tiver, tivermos, tiverem' },
      { verb: 'fazer', forms: 'fizer, fizer, fizermos, fizerem' },
      { verb: 'dizer', forms: 'disser, disser, dissermos, disserem' },
      { verb: 'ver', forms: 'vir, vir, virmos, virem' },
    ],
    examples: [
      { pt: 'Quando eu chegar, eu te ligo.', en: "When I get there, I'll call you." },
      { pt: 'Se você quiser, a gente vai no sábado.', en: 'If you want, we can go on Saturday.' },
      { pt: 'Quando ele puder, ele passa aqui.', en: 'When he can, he will drop by.' },
      { pt: 'Assim que eles terminarem, a gente começa.', en: "As soon as they finish, we'll start." },
      { pt: 'Se você vir o Pedro, dá um oi pra ele.', en: 'If you see Pedro, say hi to him.' },
    ],
    why: 'After quando and se, use the future subjuntivo when the event has not happened yet.',
  },

  perf_comp: {
    summary: 'The present perfect composto: an action that repeats or continues up to now. Formed with tenho, tem, temos or têm plus the past participle.',
    uses: [
      { title: 'Lately, over a period', pt: 'Ela tem trabalhado muito este ano.', en: "She's been working a lot this year." },
      { title: 'Something you keep doing', pt: 'Eu tenho estudado português todo dia.', en: "I've been studying Portuguese every day." },
      { title: 'A repeated habit up to now', pt: 'Eles têm saído muito ultimamente.', en: "They've been going out a lot lately." },
    ],
    signals: ['ultimamente', 'este ano', 'nos últimos dias', 'desde março', 'cada vez mais'],
    irregulars: [
      { verb: 'fazer', forms: 'feito' },
      { verb: 'dizer', forms: 'dito' },
      { verb: 'ver', forms: 'visto' },
      { verb: 'abrir', forms: 'aberto' },
    ],
    examples: [
      { pt: 'Eu tenho estudado português todo dia.', en: "I've been studying Portuguese every day." },
      { pt: 'Ela tem trabalhado muito este ano.', en: "She's been working a lot this year." },
      { pt: 'Nós temos conversado bastante sobre isso.', en: "We've been talking about this a lot." },
      { pt: 'Ele tem chegado tarde toda semana.', en: "He's been arriving late every week." },
      { pt: 'Eu não tenho visto filmes ultimamente.', en: "I haven't been watching movies lately." },
    ],
    note: "Watch out: tenho falado means \"I've been speaking lately\", not \"I spoke\". For a finished event, use falei.",
    why: 'Use it for an action that repeats or continues up to now; one finished event takes the perfeito.',
  },

  fut: {
    summary: 'The simple future. You mostly see it in writing, news and set phrases. In speech Brazilians say ir plus the infinitive.',
    uses: [
      { title: 'A formal promise', pt: 'Eu falarei com o gerente amanhã.', en: "I will talk to the manager tomorrow." },
      { title: 'News and writing', pt: 'O governo anunciará as novas medidas amanhã.', en: 'The government will announce the new measures tomorrow.' },
      { title: 'A set phrase', pt: 'Você verá que tenho razão.', en: "You'll see I'm right." },
    ],
    signals: ['amanhã', 'no futuro', 'um dia', 'em breve', 'daqui a'],
    irregulars: [
      { verb: 'fazer', forms: 'farei, fará, faremos, farão' },
      { verb: 'dizer', forms: 'direi, dirá, diremos, dirão' },
      { verb: 'trazer', forms: 'trarei, trará, traremos, trarão' },
    ],
    examples: [
      { pt: 'Eu te enviarei o relatório amanhã.', en: "I'll send you the report tomorrow." },
      { pt: 'Ela será a nova diretora.', en: "She'll be the new director." },
      { pt: 'Nós faremos o possível para ajudar.', en: "We'll do our best to help." },
      { pt: 'Vocês terão notícias em breve.', en: "You'll hear from us soon." },
      { pt: 'Eles dirão a verdade no final.', en: 'They will tell the truth in the end.' },
    ],
    why: 'In speech, ir plus the infinitive is more natural; use this form for writing and set phrases.',
  },

  inf_pess: {
    summary: 'The personal infinitive takes an ending for nós and eles, and it follows words like para, sem and depois de. For eu and você you use the plain infinitive.',
    uses: [
      { title: 'After para', pt: 'Para vocês entenderem, eu explico de novo.', en: "So that you understand, I'll explain again." },
      { title: 'After sem', pt: 'Saímos sem eles perceberem.', en: 'We left without them noticing.' },
      { title: 'After depois de', pt: 'Depois de vocês chegarem, a gente começa.', en: "After you arrive, we'll start." },
    ],
    signals: ['para', 'sem', 'antes de', 'depois de', 'ao'],
    irregulars: [
      { verb: 'pôr', forms: 'pormos, porem' },
    ],
    examples: [
      { pt: 'Estudamos muito para nós passarmos no exame.', en: 'We studied hard so that we would pass the exam.' },
      { pt: 'Saímos sem eles perceberem.', en: 'We left without them noticing.' },
      { pt: 'Depois de vocês chegarem, a gente começa.', en: "After you arrive, we'll start." },
      { pt: 'É importante nós falarmos a verdade.', en: "It's important for us to tell the truth." },
      { pt: 'Para eles terem tempo, a gente adia a reunião.', en: 'So they have time, we will put off the meeting.' },
    ],
    why: 'Use the personal infinitive mainly with nós and eles, after para, sem and depois de.',
  },
};
