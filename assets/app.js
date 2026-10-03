/* Тени над Дунаем — карточка Малкавиана v2. Данные: ../data/<slug>.json */
(function(){
  const root = document.documentElement;
  const SLUG = root.dataset.slug;
  const VOICE = root.dataset.voice;
  const POLL = 60000;
  const qs = new URLSearchParams(location.search);          // ?night=0..4 &late=1 — предпросмотр
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- голоса ---------- */
  const VOICES = {
    euthymius:{ epithet:"Голос из-под переплёта", sub:"Списки", outTitle:"Последняя страница",
      empty:"Лист чист. Здесь ещё ничего не записано.\nНо поля уже кто-то разлиновал.",
      late:"Свеча догорела, а ты всё читаешь.",
      hidden:"на полях пишут правду",
      whispers:["брат","отвергнут","запиши","пепел","изгнание","рука","алтарь","на полях"] },
    ashme:{ epithet:"Голос из сада пепла", sub:"Лепестки", outTitle:"Четвёртая ночь",
      empty:"Сад ещё не посажен. Пепел тёплый.\nКто-то ждёт, когда ты протянешь руки.",
      late:"Ночью сад слышит лучше. Говори.",
      hidden:"сад растёт из того, что сожгли",
      whispers:["сад","мать","дочь","отдай","пепел тёплый","не высыхает","протяни руки"] },
    lane:{ epithet:"Голос со двора", sub:"Правила игры", outTitle:"Последний кон",
      empty:"Пока никто не водит. Считалочка не началась.\nНе выходи со двора.",
      late:"Ты ещё не спишь? Мне тоже нельзя.",
      hidden:"кто считает до пяти?",
      whispers:["не выходи","раз-два-три","кто водит?","спрячься","не надо","мост","я вожу"] },
    prokhor:{ epithet:"Голос с паперти", sub:"Подаяние", outTitle:"Четвёртая ночь",
      empty:"Пусто, богатая, пусто!\nДураку нечего тебе дать. Пока.",
      late:"Ночью все богатые — бедные.",
      hidden:"дурак видит, кто ряженый",
      whispers:["пусто","подай","дурак знает","снег","босой","богатая","не бери"] },
    tommazo:{ epithet:"Голос из протокола", sub:"Листы дела", outTitle:"Приговор",
      empty:"Протокол открыт. Показаний нет.\nТишина тоже записывается.",
      late:"Заседание продолжается без перерыва.",
      hidden:"не всё в деле подшито",
      whispers:["записано","свидетель","покайся","протокол","молчание","приговор","внесено в дело"] },
    ilinka:{ epithet:"Примоген", sub:"", outTitle:"",
      empty:"", late:"Ночью молитва слышнее.", hidden:"Exsurge, Domine",
      whispers:["пастырь","стадо","агнец","я знаю","не бойся","прости их","всё по плану","волкам нужен пастух"] }
  };
  const MODE = root.dataset.mode || "player";
  const COMMON_WHISPERS = ["агнец","пятеро","не оборачивайся","скоро"];
  const V = VOICES[VOICE] || VOICES.euthymius;
  const NIGHTS = { N1:"Первая ночь", N2:"Вторая ночь", N3:"Третья ночь", N4:"Четвёртая ночь" };
  const LINK_ICONS = { masters:"✦", ilinka:"☾", chat:"⌘" };

  /* интенсивность безумия по ночам: интервалы в мс (0 — выключено) */
  const FX = {
    whisper:[0,16000,9000,5000,2200],
    glitch: [0,0,9000,4500,2000],
    mirror: [0,0,0,12000,5000],
    blot:   [1,2,3,5,8],      // из 10 панелей
    drip:   [0,0,0,3,6],
    sky:    [3,5,8,12,18]     // лепестки/угли Ашме
  };

  /* ---------- знаки (оригинальные) ---------- */
  const LIT = [0,1,3,4,5];
  function sym(lit, cls){
    let arcs = "";
    for(let i=0;i<5;i++){
      const a0 = (-90 + i*72 + 8) * Math.PI/180, a1 = a0 + 56*Math.PI/180;
      const p = a => `${(50+40*Math.cos(a)).toFixed(2)} ${(50+40*Math.sin(a)).toFixed(2)}`;
      arcs += `<path class="arc${i<lit?" lit":""}" d="M${p(a0)} A40 40 0 0 1 ${p(a1)}"/>`;
    }
    return `<svg class="sym ${cls||""}" viewBox="0 0 100 100" aria-hidden="true">${arcs}<line x1="50" y1="66" x2="50" y2="30"/><path d="M37 43 L50 28 L63 43"/><circle class="dot" cx="50" cy="77" r="4.5"/></svg>`;
  }
  const symStep = n => {
    const arcs = sym(5,"").match(/<path class="arc[^>]*>/g).join("").replace(/ lit/g,"");
    const parts = [arcs, `<line x1="50" y1="66" x2="50" y2="30"/><path d="M37 43 L50 28 L63 43"/>`, `<circle class="dot" cx="50" cy="77" r="4.5"/>`];
    return `<svg class="sym" viewBox="0 0 100 100">${parts.slice(0,n).join("")}</svg>`;
  };
  const CLAN_SIGN = `<svg viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 50 Q50 12 92 50 Q50 88 8 50 Z"/><path d="M50 37 A13 13 0 1 0 50 63 A9 13 0 1 1 50 37 Z" fill="currentColor" stroke="none"/><line x1="38" y1="80" x2="36" y2="90"/><line x1="50" y1="83" x2="50" y2="94"/><line x1="62" y1="80" x2="64" y2="90"/></svg>`;

  const DROL = [
    `<svg viewBox="0 0 44 34"><circle cx="24" cy="16" r="9"/><path d="M24 16 m-4 0 a4 4 0 1 1 4 4"/><path d="M6 27 Q22 30 38 27 Q42 26 41 21 M41 21 L39 13 M41 21 L44 14"/></svg>`,
    `<svg viewBox="0 0 44 34"><path d="M4 22 Q14 8 25 18 Q31 9 40 11 Q33 15 31 22 Q20 31 4 22 Z"/><circle cx="35" cy="13" r=".8"/><path d="M14 27 L12 33 M20 28 L19 33"/></svg>`,
    `<svg viewBox="0 0 44 34"><path d="M4 17 Q18 3 32 17 Q18 31 4 17 Z M32 17 L42 9 L42 25 Z"/><circle cx="11" cy="15" r="1"/></svg>`,
    `<svg viewBox="0 0 44 34"><path d="M6 28 Q10 6 22 6 Q34 6 38 28 M14 28 Q16 14 22 14 Q28 14 30 28"/><path d="M22 6 L22 2"/></svg>`
  ];
  const HOP = `<svg viewBox="0 0 30 50" width="26" height="44"><rect x="9" y="2" width="12" height="10"/><rect x="3" y="12" width="12" height="10"/><rect x="15" y="12" width="12" height="10"/><rect x="9" y="22" width="12" height="10"/><rect x="9" y="32" width="12" height="10"/></svg>`;
  const STAMPS = ["SECRETUM","VISUM","IN CAMERA","SUB SIGILLO"];

  /* ---------- блоки текста ---------- */
  const CLAN = `
    <h2>Клан</h2>
    <blockquote>В случае Нови Сада клан Малкавиан это натурально секта судного дня.</blockquote>
    <blockquote>Все персонажи клана посвящены в эту историю. Играть в клан и не играть в это - не получится.</blockquote>
    <blockquote>Для Малкавиан внутреннее всегда важнее внешнего, мысли и душа - важнее фактов.</blockquote>
    <blockquote>Малкавианы это общность. Они не вцепились в друг друга - прекрасно взаимодействуют с другими, поддерживают связи, но ставят клан выше всего остального. Потому что котерии изменяться, князь смениться, но пока у тебя есть клан - ты не один со своим безумием.</blockquote>
    <blockquote>Наружу Малкавианы горды быть безумными и скорее смеются над остальными за их излишнюю попытку рационализировать все.</blockquote>
    <blockquote>Малкавиан это клан про внутренние эволюции, безумие и движение. Это те, кто замечает детали и складывает пасьянс из незначительных элементов.</blockquote>
    <blockquote>Внутри Малкавиана - его безумие. Его безумие и часть него и худший враг. Оно страшнее зверя. В него невозможно не падать но и не боятся этого сложно. Безумие хочется с кем-то разделять. Ведь те, вокруг - якори на которых можно держаться.</blockquote>
    <blockquote>Клан во многом играет “против всех” и хотя Малкавиан не являются антагонистами этой игры, но мы точно делаем свой маленький кружок, вертим свой заговор и окружающим не понравится если (когда) они узнают что тут происходит.</blockquote>`;

  const SIGN = `
    <h2>Знак</h2>
    <div class="symbox">${sym(5,"")}
      <div>
        <p>Пять дуг — пять этапов. Черта вверх — восхождение. Точка под ней — агнец.</p>
        <div class="steps"><figure>${symStep(1)}<figcaption>1</figcaption></figure><figure>${symStep(2)}<figcaption>2</figcaption></figure><figure>${symStep(3)}<figcaption>3</figcaption></figure></div>
      </div>
    </div>
    <p class="hidline"><mark class="hid">${V.hidden}</mark></p>`;

  const FULL_RULES = "<h3>Безопасность</h3>\n<p>Психозы, особенно их натуралистичная игра - тема скользкая и напряженная. Что бы игра не превратилась в травму мы внутри клана вводим стоп слово “Ананас”. Если происходящее для вас невыносимо - Ананас останавливает сцену.</p>\n<p>Также вы можете всегда покинуть некомфортное по жизни взаимодействие и при объяснении Анансом примоген не будет держать на вас зла.</p>\n<p>Если ваше безумие и путь вашего персонажа делает больно вам - поговорите с примогеном, смените психоз или возьмите таймаут. Эскалируя безумие персонажа следите за собой и своей безопасностью, пожалуйста.</p>\n<h3>Правила по Безумию (версия Малкавиан)</h3>\n<p>Важно: все карточки написаны довольно нарративно, не надо играть в слова и искать лазейки (Человек не значит что не распространяется на сородичей, если сказано что не можешь сказать - написать и иным образом донести тоже не можешь). Все карточки не заложены как идея принести вам пожизневый бред - не нарушайте законы, не ведите себя аморально на открытых пространствах и не вовлекайте в игру тех, кто в ней не участвует. Карточки не подразумевают таких действий, но писать в каждой про применимость только безопасно, только к участникам или только к игровым предметам - очень геморройно. Достаточно выполнять карточку только в адрес участников проекта. Бесхозные камешки тоже могут быть объектами, если подбирание их не нарушает законы.</p>\n<p>Все что описано в карточке это восприятие вашего персонажа - на вас по прежнему работают все правила так как они работают, хотя ваш персонаж не замечает головой эти эффекты если они противоречат его восприятию.</p>\n<p>Везде где нет подробных уточнений - трактуйте широко и додумывайте детали сами.</p>\n<h3>Встреча Клана (каждый игровой день):</h3>\n<p>Каждая игровая ночь для Малкавиан начинается с встречи клана. Эта встреча собирается через Зов поэтому вы во первых всегда знаете что вам надо туда идти, во вторых вашему персонажу сложно не прийти на нее если он хотя бы в капле сознания (а на старте ночи едва ли вы в торпоре).</p>\n<p>Какими конкретно будут Встречи Клана и что там будет происходить вы узнаете ближе к делу, обстоятельства и правила каждой из них Примоген будет рассказывать отдельно.</p>\n<p>Сейчас нас интересует механическая часть.</p>\n<p>В начале вечера примоген будет спрашивать вас про ваше безумие (если вы опоздаете - подойдите после окончания ивента лично если примоген не повторил запрос во время события).</p>\n<p>Примоген вызывает по одному и задает вопрос о безумии прошлой ночи. Вы рассказываете о своих похождениях - как связанных с моделью так и нет.</p>\n<p>В ходе рассказа вы сдаете все вчерашние карты безумия (Можете обыгрывать, можете сунуть стопкой - не важно) которые остались у вас на руках.</p>\n<p>Затем примоген просит вас прислушаться к безумию - вы тянете из протянутой колоды столько карт сколько следует из этих правил (по умолчанию 5). Это ваша колода на ночь впереди.</p>\n<p>1.  Одну карту Малкавиан обязан взять себе и отыгрывать в течение всей ночи. Сила эффекта может меняться - вы не обязаны постоянно быть в остром психозе - но забывать совсем не стоит. Ее вы откладываете отдельно - вы не можете ее передать в ходе ночи.</p>\n<p>2.  Оставшиеся карты вы можете как отдать в рамках дисциплины помешательство 2, отдать в рамках ауры безумия или оставить себе и сыграть сами (или даже не сыграть). Про все четыре опции расскажут в этом тексте ниже.</p>\n<p>3.  В ходе ночи вам стоит (или по ее финалу) отправлять примогену инфу о движении карт (допустим: “Зеркало” психоз ночи, “Куклу” передал Васе, “Шорох” и “Призрак” сыграл сам).</p>\n<p>Ваша связь с Малк-нетом напрямую зависит от числа сыгранных вами лично и переданных карт.</p>\n<table class=\"rt\"><tr><th>Сыграно*</th><th>Эффект</th></tr><tr><td>1**</td><td>Вы тянете 3 карты</td></tr><tr><td>2</td><td>Вы тянете 5 карт, у вас есть +1 бумажка в Малкнете</td></tr><tr><td>3</td><td>Вы тянете 5 карт, вы получаете сюжетное видение, + 1 бонус в Малкнете</td></tr><tr><td>4</td><td>Вы тянете 7 карт, вы получаете сюжетное видение, + 2 бонуса в Малкнете</td></tr><tr><td>5</td><td>Вы тянете 7 карт, вы получаете сюжетное видение, + 2 бонуса в Малкнете и + 1 бумажка в Малкнет</td></tr><tr><td>6 и более</td><td>Вы тянете 9 карт, вы получаете сюжетное видение и еще одно если были пропуски до, + 3 бонуса в Малкнете</td></tr></table>\n<p>* - Любым способом - на себя, на других, дисциплиной - не важно.</p>\n<p>** - Психоз ночи считается как “1” - по умолчанию вы хорошие игроки и мы не верим в 0</p>\n<p>Механически не регулируется то насколько охотно Примоген будет отвечать вам на ваши запросы - это зависит от нарративных составляющих, включая ее отношение. Но очевидно что чем безумнее вы - тем лучше она к вам относиться и тем выше вы в ее приоритете ответов и задач. Поговорить с вами без конкретики (Философски поразгонять) примоген готов и без хорошего рейтинга по умолчанию.</p>\n<p>Важно - Мат. Компонент Примогена может не помнить сразу то что вы хотите - в таком случае она сообщит вам что вам надо подождать и пришлет ответ в Телеграмм (не забудьте его оставить!) как только соберет достаточно данных, но в течении этой ночи. Примоген всегда как игротех старается сделать это быстрее, так что ответ может настигнуть вас и через минуту.</p>\n<h3>Что делать с картами, которые не психоз ночи?</h3>\n<p>Помешательство 2 - Один из вариантов их реализации. Правила описаны в дисциплине. При воздействии вы всегда отдаете выбранную карточку игроку, а себе забираете оставшиеся. Можно таким образом влиять на игротехов.</p>\n<p>Аура безумия - в любой момент времени вы имеете право передать карточку другому игроку (не игротеху).</p>\n<p>Если он Малкавиан - он забирает ее в свой пул и должен сегодня разыграть (не важно через ауру или сам).</p>\n<p>Если он не Малкавиан - у него есть несколько путей. Он может не играть в выданную вами карточку никаким образом. Может играть. Это часть правил по безумию вас касается мало.</p>\n<p>Сыграть самому - вы играете в описанный на карте психоз в течении не менее чем 10 минут. Карточка считается сыгранной если ваше безумие оказало эффект на происходящую сцену - изменило ее ход, изменило отношения или что-то другое. Карта не сыграна если вы сидите в углу и вас не замечают, если в пространстве нет других участников игры.</p>\n<p>Вы можете прекратить играть карточку через 10 минут если эффект произведен или продолжать до конца ночи сколько вам хочется.</p>\n<p>Эту карту больше нельзя передать - только следующей ночью сдать примогену.</p>\n<p>Игнорировать - вы можете ничего не делать с лежащей у вас карточкой (если вы получили ее от примогена, а не если вам дал ее другой Малк). Ничего не делаете - ничего не будет.</p>\n<p><b>Что если я получил психоз под конец игровой ночи, но обязан его играть, а все уже разошлись спать?</b></p>\n<p>Собщите Примогену и не сдавайте его в начале следующей ночи - он будет считаться переданным вам в ее начале.</p>\n<p><b>На карточке цель определена как “персонаж который” - это значит что объект меняется?</b></p>\n<p>Нет, ты запечетляешься на первом кто подойдет под условие до конца эффекта карточки. Старайся выбирать игроков для долгих эффектов.</p>\n<p>Важно - вы не можете показывать отыгрываемую карточку или как-то доносить ее содержание до другого игрока.</p>\n<h3>Малкнет</h3>\n<p>Каждый игровой день ваш персонаж может сходить в Малкнет (1 раз в общем случае). Для этого вам необходимо сообщить о желании Примогену и прибыть в назначеное время в назначенное место (обычно время будет +/- 30 минут от момента ответа Примогена, если не совпадает со временем ивентов. Или через 30 минут от конца ивента по расписанию).</p>\n<p>Малкнет это ваше духовное погружение, Примоген присутствует сугубо чтобы подсказывать по правилам и обеспечивать техническую сторону - вы не обязаны делится с ней информацией, можете проводить диалог технически (но лучше конечно в роли).</p>\n<p>Перед началом вы заявляете Примогену те бонусы, которые у вас есть на эту ночь (бонусы на следующую ночь не копятся). Если у вас получены не конкретные бонусы, а как выше в правилах безумия “1 бонус” - вы сами выбираете какой из списка.</p>\n<p>Затем вы идете в комнату. В комнате достаточно темно, но фонариком или телефоном пользоваться в ходе этого нельзя.</p>\n<p>//Список существуюших бонусов приедет чуть позже//</p>\n<p>В комнате развешаны бумажки. Бумажки висят на веревках. Снять веревку вы можете</p>\n<p>целиком (сдернув) или обрезав ту часть что хотите (все что ниже - придется забрать, подвязать обратно нельзя).</p>\n<p>Вы собираете столько бумажек них сколько имеете право за отведенное время (считаются бумажки а не веревки!). Как выбирать веревки - вы сами решаете. С пола подбирать бумажки как и с предметов можно.</p>\n<p>Взял бумажку - забираешь бумажку.</p>\n<p>По окончанию времени вы выходите из комнаты даже если не собрали нужное число бумажек или не нашли что искали.</p>\n<p>Все найденные бумажки - ваши. Какие-то из них могут оказаться пустыми - что ж, сеть дело тонкое. Какие-то могут не быть полезными для игры - что ж, сеть место безумное. Трактовка бумажек лежит на ваших плечах. Их нельзя у вас отнять или украсть - они не существуют в материальном мире и сохраняются у вас лишь как шпаргалки по поводу того, что же вы там узнали в сети.</p>\n<p>Если каким-то путем у вас есть право (или появилось) сходить в Малкнет еще раз - вы можете заявить это сразу или по общему правилу этого действия, но учтите что при походе второй и более раз за ночь Примоген выдаст вам психоз в колоду, работающий по правилам переданного Малкавианом психоза (те этой ночью вы должны его сыграть).</p>";
  const RULES = `
    <div class="panel"><h2>Встреча клана</h2>
      <p>Каждая ночь начинается со встречи клана по Зову. Примоген спрашивает о безумии прошлой ночи — ты рассказываешь и сдаёшь вчерашние карты.</p>
      <p>Затем тянешь из колоды карты на ночь (по умолчанию <b>5</b>):</p>
      <ul class="clean">
        <li><b>Одна — психоз ночи.</b> Отыгрываешь всю ночь, передать нельзя.</li>
        <li>Остальные можно отдать через <b>Помешательство 2</b>, через <b>Ауру безумия</b>, <b>сыграть самому</b> или <b>игнорировать</b>.</li>
        <li>По ходу ночи сообщай примогену о движении карт: «Зеркало — психоз ночи, Куклу передал Васе, Шорох сыграл сам».</li>
        <li>Показывать карточку или пересказывать её другому игроку нельзя.</li>
      </ul></div>
    <div class="panel"><h2>Что делать с картами</h2>
      <h3>Помешательство 2</h3><p>Отдаёшь выбранную карточку цели, остальные остаются у тебя. Работает и на игротехов.</p>
      <h3>Аура безумия</h3><p>В любой момент передаёшь карточку другому игроку (не игротеху). Малкавиан обязан разыграть её этой ночью. Не-малкавиан — по желанию.</p>
      <h3>Сыграть самому</h3><p>Не меньше <b>10 минут</b>, и безумие должно повлиять на сцену: изменить ход, отношения, что-то ещё. В углу в одиночестве — не считается. Сыгранную карту больше нельзя передать.</p>
      <h3>Игнорировать</h3><p>Можно, если карту дал примоген, а не другой Малк. Ничего не делаешь — ничего не будет.</p>
      <p style="font-size:15px;color:var(--muted)">Цель «персонаж, который…» — это первый подошедший под условие, до конца эффекта. Психоз под конец ночи — скажи примогену и не сдавай: он перейдёт на следующую.</p></div>
    <div class="panel"><h2>Сыграно → связь с Малкнетом</h2>
      <table class="rt">
        <tr><th>Сыграно*</th><th>Эффект</th></tr>
        <tr><td>1**</td><td>Тянешь 3 карты</td></tr>
        <tr><td>2</td><td>5 карт, +1 бумажка в Малкнете</td></tr>
        <tr><td>3</td><td>5 карт, сюжетное видение, +1 бонус</td></tr>
        <tr><td>4</td><td>7 карт, сюжетное видение, +2 бонуса</td></tr>
        <tr><td>5</td><td>7 карт, сюжетное видение, +2 бонуса, +1 бумажка</td></tr>
        <tr><td>6+</td><td>9 карт, видение (и ещё одно за пропуски), +3 бонуса</td></tr>
      </table>
      <p style="font-size:14px;color:var(--muted)">* любым способом: на себя, на других, дисциплиной. ** психоз ночи считается за 1.</p></div>
    <div class="panel"><h2>Малкнет</h2>
      <ul class="clean">
        <li>Раз за ночь. Скажи примогену — придёшь в назначенное место примерно через 30 минут.</li>
        <li>Перед входом заяви бонусы на эту ночь (не копятся). «1 бонус» выбираешь сам.</li>
        <li>В комнате темно. Фонарик и телефон нельзя.</li>
        <li>Бумажки висят на верёвках. Сдёрнул или обрезал — всё, что ниже, забираешь. Подвязать обратно нельзя. С пола подбирать можно. Считаются бумажки, а не верёвки.</li>
        <li>Время вышло — выходишь. Бумажки твои, их нельзя отнять или украсть. Пустые бывают: сеть дело тонкое.</li>
        <li>Второй поход за ночь — примоген добавит тебе психоз, который нужно сыграть.</li>
      </ul></div>
    <div class="panel" style="text-align:center"><h2>Стоп-слово</h2>
      <div class="stop">«Ананас»</div>
      <p style="margin-top:8px">Останавливает сцену, если происходящее невыносимо. Можно всегда выйти из некомфортного взаимодействия — примоген не будет держать зла. Если безумие делает больно тебе самому — поговори с примогеном, смени психоз, возьми таймаут.</p></div>
    <details class="panel fullrules"><summary>Открыть полное</summary><div class="fulltext">${FULL_RULES}</div></details>`;

  /* ---------- утилиты ---------- */
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const safeUrl = u => /^(https?:|tg:)/i.test(u||"") ? u : "#";
  const store = {
    get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } },
    set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  };
  const hash = s => { let h = 2166136261; for(const c of String(s)){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rnd = seed => { let x = hash(seed) || 1; return () => ((x = Math.imul(x ^ (x >>> 15), 2246822507) ^ Math.imul(x ^ (x >>> 13), 3266489909)) >>> 0) / 4294967296; };
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const roman = n => ["","I","II","III","IV","V","VI","VII","VIII","IX","X"][n] || n;
  /* разметка в текстах: ~~ложь~~{правда}  [[скрытое]]  ||цензура|| */
  const markup = s => esc(s)
    .replace(/~~(.+?)~~\{(.+?)\}/g, "<s>$1</s><ins>$2</ins>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/\[\[(.+?)\]\]/g, '<mark class="hid">$1</mark>')
    .replace(/\|\|(.+?)\|\|/g, '<span class="redact">$1</span>');

  /* разбиваем текст на буквы для глитча и зеркала */
  function letterize(el){
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = []; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      if(n.parentElement.closest(".redact,mark.hid")) return;
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(part => {
        if(!part) return;
        if(/^\s+$/.test(part)){ frag.appendChild(document.createTextNode(part)); return; }
        const w = document.createElement("span"); w.className = "w";
        for(const ch of part){ const c = document.createElement("span"); c.className = "ch"; c.textContent = ch; w.appendChild(c); }
        frag.appendChild(w);
      });
      n.replaceWith(frag);
    });
  }

  /* ---------- состояние ---------- */
  let last = "", data = null, activeTab = store.get("malk-tab-"+SLUG) || "frags";
  const night = () => { const q = qs.get("night"); const n = q!==null ? +q : (data && +data.night) || 0; return Math.max(0, Math.min(4, n || 0)); };

  function shell(){
    document.body.innerHTML = `
      <div class="sky" id="sky"></div>
      <div class="wrap">
        <header class="head">
          ${MODE === "primo" ? `<a class="back" href="../${esc(root.dataset.cms||"")}/">← пульт</a>` : ""}
          <span class="clan">${CLAN_SIGN}</span>
          <div class="mark" id="mark"></div>
          <div class="epithet" id="epithet"></div>
          <h1 id="name">…</h1>
          <div class="sub">Малкавиан · Нови-Сад</div>
          <div class="late-line">${esc(V.late)}</div>
        </header>
        <div id="notice"></div>
        <div id="nightbox"></div>
        <nav class="tabs" role="tablist">
          ${MODE === "primo"
            ? `<button data-t="me">Я</button><button data-t="plot">Ход сюжета</button><button data-t="sched">Расписание</button><button data-t="rules">Правила</button><button data-t="grules">Правила игры</button>`
            : `<button data-t="me">Я</button><button data-t="frags">Осколки</button><button data-t="events">События</button><button data-t="rules">Правила</button>`}
        </nav>
        <div id="gate"></div>
        <section class="tab" id="t-me"></section>
        <section class="tab" id="t-frags"></section>
        <section class="tab" id="t-events"></section>
        <section class="tab" id="t-plot"></section>
        <section class="tab" id="t-sched"></section>
        <section class="tab" id="t-rules">${RULES}</section>
        <section class="tab" id="t-grules"></section>
        <footer class="foot" id="links"></footer>
        <div class="stamp-time" id="stamp"></div>
        <span class="foot-clan">${CLAN_SIGN}</span>
      </div>`;
    document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => setTab(b.dataset.t));
    document.addEventListener("click", e => { const m = e.target.closest("mark.hid"); if(m) m.classList.toggle("shown"); });
    setTab(activeTab);
  }
  function setTab(t){
    if(!document.querySelector(`.tabs button[data-t="${t}"]`)) t = MODE === "primo" ? "me" : "frags";
    activeTab = t; store.set("malk-tab-"+SLUG, t);
    document.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.t===t));
    document.querySelectorAll(".tab").forEach(s => s.classList.toggle("on", s.id==="t-"+t));
  }

  /* украшения и пятна на панели — стабильны для одного и того же осколка */
  function decorate(panel, seed, idx){
    const r = rnd(seed), n = night();
    panel.style.setProperty("--r", (r()*2-1).toFixed(2));
    panel.style.setProperty("--sx", (r()>.5?1:-1));
    panel.style.setProperty("--sy", ((r()*2-1)).toFixed(2));
    const add = html => panel.insertAdjacentHTML("beforeend", html);
    add(`<i class="frame"></i>`);
    if(r()*10 < FX.blot[n]){
      const x = r()<.5 ? 1 + r()*6 : 86 + r()*6, y = 10 + r()*75, s = 9 + r()*16;
      add(`<i class="blot" style="left:${x}%;top:${y}%;width:${s}px;height:${s*.8}px"></i><i class="blot s" style="left:calc(${x}% + ${s+4}px);top:calc(${y}% - 6px);width:${s/3}px;height:${s/3}px"></i>`);
    }
    if(r()*10 < FX.drip[n]) for(let i=0;i<1+Math.floor(r()*2);i++) add(`<i class="drip" style="left:${10+r()*80}%;height:${18+r()*46}px;animation-delay:${(r()*2).toFixed(1)}s"></i>`);
    switch(VOICE){
      case "euthymius":
        if(r() < .55) add(`<i class="drol" style="${r()<.5?"left":"right"}:${-6+r()*10}px;bottom:${4+r()*14}px;transform:rotate(${(r()*30-15).toFixed(0)}deg)">${DROL[Math.floor(r()*DROL.length)]}</i>`);
        break;
      case "lane": {
        const cols = ["var(--a1now)","var(--a2)","#2a5bd0","#e0a020"];
        const items = ["★","♡","☼","✿","1 2 3",HOP,"@"];
        const k = 1 + Math.floor(r()*2);
        for(let i=0;i<k;i++){ const it = items[Math.floor(r()*items.length)];
          add(`<span class="doodle" style="color:${cols[Math.floor(r()*cols.length)]};${r()<.5?"right":"left"}:${6+r()*16}px;${r()<.5?"bottom":"top"}:${10+r()*20}px;font-size:${20+r()*12}px;transform:rotate(${(r()*40-20).toFixed(0)}deg)">${it}</span>`); }
        break; }
      case "prokhor":
        if(r() < .6) add(`<i class="soot" style="${r()<.5?"right":"left"}:${8+r()*30}px;bottom:${6+r()*20}px;transform:rotate(${(r()*60-30).toFixed(0)}deg)"></i>`);
        if(idx % 2 === 0) for(let i=0;i<2+Math.floor(r()*2);i++) add(`<i class="wax" style="left:${15+r()*25+i*4}%;height:${8+r()*22}px;width:${6+r()*5}px"></i>`);
        break;
      case "ilinka":
        if(r() < .45) add(`<i class="owl" style="${r()<.5?"right":"left"}:${10+r()*20}px;${r()<.5?"bottom":"top"}:${8+r()*14}px;animation-delay:${(r()*5).toFixed(1)}s"></i>`);
        break;
      case "tommazo":
        if(panel.closest(".frag")){ add(`<i class="seal"></i>`); if(r() < .7) add(`<span class="stamp">${STAMPS[Math.floor(r()*STAMPS.length)]}</span>`); }
        break;
    }
  }

  function fragHTML(f, seen, label){
    const isNew = seen && !seen.includes(f.id);
    const folio = VOICE==="euthymius" && f.n ? `<span class="folio">f. ${roman(f.n)}</span>` : (VOICE==="tommazo" && f.n ? `<span>лист ${f.n}</span>` : "");
    return `<div class="frag${isNew?" new":""}" data-seed="${esc(f.id)}"><div class="panel">
      <div class="meta"><span>${esc(label || NIGHTS[f.night] || f.night || "")}</span>${folio}</div>
      <div class="card">${markup(f.card)}</div>
      ${f.audio ? `<audio controls preload="none" src="${esc(safeUrl(f.audio))}"></audio>` : ""}
      ${f.text ? `<details><summary>Целиком</summary><div class="text">${markup(f.text)}</div></details>` : ""}
    </div></div>`;
  }

  const fmtDate = s => { if(!s) return ""; const d = new Date(s+"T12:00:00"); if(isNaN(d)) return s;
    return ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"][d.getDay()] + " " + String(d.getDate()).padStart(2,"0") + "." + String(d.getMonth()+1).padStart(2,"0"); };
  const sortEv = (a,b) => ((a.date||"9")+(a.time||"")).localeCompare((b.date||"9")+(b.time||""));
  const mapUrl = e => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(e.address || (e.place + " Novi Sad"));
  function evHTML(e, extra){
    const now = e.day && e.day === "N" + night();
    return `<div class="frag evp${now?" now":""}" data-seed="${esc(e.id)}"><div class="panel">
      <div class="meta"><span>${esc(NIGHTS[e.day] || "вне ночей")}</span><span>${esc(fmtDate(e.date))}${e.time?" · "+esc(e.time):""}</span></div>
      <div class="card">${markup(e.title)}</div>
      ${e.place || e.address ? `<div class="where">⌖ ${esc(e.place||"")}${e.address?` · <a href="${mapUrl(e)}" target="_blank" rel="noopener">${esc(e.address)}</a>`:""}</div>` : ""}
      ${e.desc ? `<p class="evdesc">${markup(e.desc)}</p>` : ""}
      ${e.prep ? `<div class="prep"><span class="lbl">Что сделать до</span>${markup(e.prep)}</div>` : ""}
      ${extra || ""}
    </div></div>`;
  }

  function render(){
    if(MODE === "primo") return renderPrimo();
    const d = data || {}, p = d.player || {}, n = night();
    root.dataset.night = n;
    document.title = (p.character || "Малкавиан") + " — " + V.epithet;
    document.getElementById("epithet").innerHTML = esc(V.epithet) + (p.showVoiceName && p.voiceName ? ` <span class="vname">· ${esc(p.voiceName)}</span>` : "");
    document.getElementById("name").textContent = p.character || "—";
    document.getElementById("mark").innerHTML = sym(LIT[n]);
    document.getElementById("notice").innerHTML = [d.notice, p.notice].filter(Boolean).map(x => `<div class="notice">${markup(x)}</div>`).join("");

    const arch = (title, a) => a && a.name ? `<div class="arch"><span class="lbl">${title}</span><br><b>${esc(a.name)}</b>${a.text?`<p>${esc(a.text)}</p>`:""}</div>` : "";
    document.getElementById("t-me").innerHTML = `
      <div class="panel"><h2>${esc(p.character||"Персонаж")}</h2>
        ${arch("Внешний архетип — роль в секте", p.external)}
        ${arch("Внутренний архетип — безумие", p.internal)}
        ${p.notes ? `<h3>Помни</h3><p style="white-space:pre-wrap">${markup(p.notes)}</p>` : ""}</div>
      <div class="panel">${SIGN}</div>
      <div class="panel">${CLAN}</div>`;

    const seen = store.get("malk-seen-"+SLUG);
    const frags = (d.fragments||[]).slice().sort((a,b)=>(a.n||0)-(b.n||0));
    const outs = d.outcomes||[], extra = d.extra||[];
    const sec = (ep, t, cnt) => `<div class="sec"><div class="ep">${ep}</div><div class="t">${t}</div>${cnt?`<div class="n">${cnt}</div>`:""}</div>`;
    let h = "";
    if(!frags.length && !outs.length && !extra.length){
      h = sec("осколки", esc(V.sub)) + `<div class="panel empty">${sym(LIT[n])}${esc(V.empty).replace(/\n/g,"<br>")}</div>`;
    } else {
      if(frags.length) h += sec("осколки", esc(V.sub), `${frags.length} из 7`) + frags.map(f=>fragHTML(f,seen)).join("");
      if(outs.length) h += sec("осколки", esc(V.outTitle)) + outs.map(o=>fragHTML({id:o.id,night:"N4",card:o.label,text:o.text,audio:o.audio},seen)).join("");
      if(extra.length) h += sec("осколки", "Шум Сети") + extra.map(x=>fragHTML({id:x.id,night:x.night||"",card:x.title,text:x.text,audio:x.audio},seen)).join("");
      h += `<p class="hidline"><mark class="hid">${esc(V.hidden)}</mark></p>`;
    }
    document.getElementById("t-frags").innerHTML = h;
    const evs = (d.events||[]).slice().sort(sortEv);
    document.getElementById("t-events").innerHTML = sec("события", "Куда зовут") +
      (evs.length ? evs.map(e => evHTML(e)).join("") : `<div class="panel empty">${sym(LIT[n])}Пока никуда не зовут.</div>`);
    const ids = frags.map(f=>f.id).concat(outs.map(o=>o.id), extra.map(x=>x.id));
    setTimeout(()=>store.set("malk-seen-"+SLUG, ids), 4000);

    document.querySelectorAll("#t-me .panel, #t-frags .panel, #t-events .panel").forEach((pn, i) => decorate(pn, (pn.closest(".frag")?.dataset.seed || "p") + i + VOICE, i));
    document.querySelectorAll(".head h1, .frag .card, .sec .t, #t-me .panel h2").forEach(letterize);
    if(VOICE==="euthymius") document.querySelectorAll("#t-frags .frag .card").forEach(c => { const f = c.querySelector(".ch"); if(f) f.classList.add("cap"); });
    sky();

    const L = d.links||{};
    document.getElementById("links").innerHTML = ["masters","ilinka","chat"]
      .filter(k => L[k] && L[k].show && L[k].url)
      .map(k => `<a href="${esc(safeUrl(L[k].url))}" target="_blank" rel="noopener">${LINK_ICONS[k]} ${esc(L[k].label||k)}</a>`).join("");
    document.getElementById("stamp").textContent = d.updated ? "обновлено " + new Date(d.updated).toLocaleString("ru-RU",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"}) : "";
    schedule();
  }

  /* ---------- живые эффекты ---------- */
  function sky(){
    const el = document.getElementById("sky"); if(!el) return;
    if(VOICE === "ilinka" && !REDUCED){ let h2 = ""; for(let i=0;i<FX.sky[night()];i++) h2 += `<i class="feather" style="left:${Math.random()*100}%;animation-duration:${12+Math.random()*10}s;animation-delay:${-Math.random()*15}s"></i>`; el.innerHTML = h2; return; }
    if(VOICE !== "ashme" || REDUCED){ el.innerHTML = ""; return; }
    const k = FX.sky[night()]; let h = "";
    for(let i=0;i<k;i++){
      const petal = i % 2 === 0;
      h += `<i class="${petal?"petal":"ember"}" style="left:${Math.random()*100}%;animation-duration:${(petal?9:6)+Math.random()*8}s;animation-delay:${-Math.random()*12}s"></i>`;
    }
    el.innerHTML = h;
  }
  let timers = [];
  function every(ms, fn){ if(ms && !REDUCED) timers.push(setInterval(fn, ms * (0.75 + Math.random()*0.5))); }
  function schedule(){
    timers.forEach(clearInterval); timers = [];
    const n = night();
    every(FX.whisper[n], whisper);
    every(FX.glitch[n], () => { for(let i=0;i<(n>=4?3:1);i++) glitch(); });
    every(FX.mirror[n], mirror);
  }
  const visibleChars = () => [...document.querySelectorAll(".head .ch, .tab.on .ch")];
  function glitch(){
    const cs = visibleChars(); if(!cs.length) return;
    const c = pick(cs); c.classList.remove("g"); void c.offsetWidth; c.classList.add("g");
    setTimeout(()=>c.classList.remove("g"), 450);
  }
  function mirror(){
    const cs = [...document.querySelectorAll(".head h1 .ch, .tab.on .sec .t .ch, .tab.on .panel h2 .ch")].filter(c => /[а-яёa-z]/i.test(c.textContent));
    if(!cs.length) return;
    const c = pick(cs); c.classList.add("m");
    setTimeout(()=>c.classList.remove("m"), night() >= 4 ? 9000 : 3500);
  }
  function whisper(){
    const w = document.createElement("span"); w.className = "whisper";
    w.textContent = pick(Math.random() < .25 ? COMMON_WHISPERS : V.whispers);
    const wide = innerWidth > 820, side = Math.random() < .5;
    w.style.left = (wide ? (side ? 2 + Math.random()*14 : 78 + Math.random()*12) : 4 + Math.random()*60) + "%";
    w.style.top = (8 + Math.random()*84) + "%";
    w.style.transform = `rotate(${(Math.random()*16-8).toFixed(0)}deg)`;
    document.body.appendChild(w); setTimeout(()=>w.remove(), 6200);
  }
  function lateCheck(){
    const h = new Date().getHours();
    const late = qs.has("late") ? qs.get("late") === "1" : (h >= 0 && h < 5);
    if(late) root.dataset.late = ""; else delete root.dataset.late;
  }

  /* ================= страница Илинки ================= */
  const PLAYERS = (() => { try{ return JSON.parse(root.dataset.players || "[]"); }catch(e){ return []; } })();
  let pdata = {};   // slug -> публичные данные игрока
  const b64d = s => Uint8Array.from(atob(s.replace(/\s/g,"")), c => c.charCodeAt(0));
  async function unsealWith(key, box){ const pt = await crypto.subtle.decrypt({ name:"AES-GCM", iv:b64d(box.iv) }, key, b64d(box.ct)); return JSON.parse(new TextDecoder().decode(pt)); }
  const session = () => store.get("malk-session") || (() => { try{ return JSON.parse(sessionStorage.getItem("malk-session")); }catch(e){ return null; } })();
  function gate(on, html){
    document.getElementById("gate").innerHTML = on ? html : "";
    document.querySelector(".tabs").style.display = on ? "none" : "";
    document.querySelectorAll(".tab").forEach(t => t.style.display = on ? "none" : "");
  }
  function loginForm(msg){
    gate(true, `<div class="panel login"><h2>Только для координатора</h2>
      <p>${esc(msg || "Введи пароль координатора — тот же, что в пульте.")}</p>
      <input type="password" id="lpw" autocomplete="current-password" placeholder="пароль">
      <button id="lgo">Войти</button><p class="muted" id="lst"></p></div>`);
    const go = async () => {
      const st = document.getElementById("lst"); st.textContent = "Проверяю…";
      try{
        const v = await (await fetch("../data/vault.json?t=" + Date.now(), { cache:"no-store" })).json();
        const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(document.getElementById("lpw").value), "PBKDF2", false, ["deriveKey"]);
        const k = await crypto.subtle.deriveKey({ name:"PBKDF2", salt:b64d(v.salt_c), iterations:v.iter||250000, hash:"SHA-256" }, base, { name:"AES-GCM", length:256 }, false, ["decrypt"]);
        let s; try{ s = await unsealWith(k, v.coord); }catch(e){ throw new Error("Неверный пароль."); }
        if(!s.ck) throw new Error("Зайди один раз в пульт паролем координатора — он включит эту страницу.");
        store.set("malk-session", { ...s, role:"coord", name: store.get("malk-name") || "" });
        gate(false); last = ""; load();
      }catch(e){ st.textContent = e.message; }
    };
    document.getElementById("lgo").onclick = go;
    document.getElementById("lpw").onkeydown = e => { if(e.key === "Enter") go(); };
  }
  async function loadPrimo(){
    const S = session();
    if(!S || S.role !== "coord" || !S.ck) return loginForm();
    const r = await fetch("../data/primo.json?t=" + Date.now(), { cache:"no-store" });
    const txt = r.ok ? await r.text() : "";
    const pl = await Promise.all(PLAYERS.map(p => fetch("../data/" + p.slug + ".json?t=" + Date.now(), { cache:"no-store" }).then(x => x.ok ? x.json() : null).catch(() => null)));
    const sig = txt + JSON.stringify(pl.map(x => x && x.updated));
    if(sig === last) return;
    last = sig;
    PLAYERS.forEach((p,i) => pdata[p.slug] = pl[i] || {});
    let bundle = null;
    if(txt){
      try{ const key = await crypto.subtle.importKey("raw", b64d(S.ck), { name:"AES-GCM" }, false, ["decrypt"]); bundle = await unsealWith(key, JSON.parse(txt)); }
      catch(e){ return loginForm("Ключ устарел — войди заново."); }
    }
    data = { bundle: bundle || { nights:{}, schedule:[] }, night: Math.max(0, ...pl.map(x => +(x && x.night) || 0)), empty: !bundle };
    gate(false); render();
  }
  const md = s => { let h = window.marked ? window.marked.parse(s || "") : `<pre>${esc(s||"")}</pre>`;
    return h.replace(/<table/g, '<div class="tw"><table class="rt"').replace(/<\/table>/g, "</table></div>"); };
  const pname = p => { const d = (pdata[p.slug] || {}).player || {}; return { ch: d.character || "", h: d.handle || p.title }; };
  function renderPrimo(){
    const B = data.bundle, n = night(), show = n || 1, N = (B.nights || {})[show] || {};
    root.dataset.night = n;
    document.title = "Илинка — Примоген";
    document.getElementById("epithet").textContent = V.epithet;
    document.getElementById("name").textContent = "Илинка";
    document.getElementById("mark").innerHTML = sym(LIT[n]);
    const today = (B.schedule || []).filter(e => e.day === "N" + show).sort(sortEv);
    document.getElementById("nightbox").innerHTML = data.empty
      ? `<div class="panel nightbox"><div class="card">Пакет ещё не загружен</div><p>Открой пульт → вкладка «Илинка» → «Стартовый пакет».</p></div>`
      : `<div class="panel nightbox"><div class="meta"><span>${n ? "сейчас" : "до игры · дальше"}</span><span>${esc(NIGHTS["N"+show])}</span></div>
        <div class="card">${esc(N.title || "")}</div>
        <div class="where">${esc(N.when || "")}${N.place ? " · " + esc(N.place) : ""}</div>
        ${today.length ? `<ul class="today">${today.map(e => `<li><b>${esc(e.time||"")}</b> ${esc(e.title)}${e.place?` · ${esc(e.place)}`:""}</li>`).join("")}</ul>` : ""}
        ${N.sermon ? `<h3>Проповедь</h3><p class="sermon">${markup(N.sermon)}</p>` : ""}
        <details class="nbmore"><summary>Что нужно и что вкинуть</summary>
        ${N.have ? `<h3>Что нужно</h3><p>${markup(N.have)}</p>` : ""}
        <h3>Вкинуть</h3><ul class="throw">${PLAYERS.map(p => { const t = (N.throw || {})[p.id]; const nm = pname(p);
          return t ? `<li><b>${esc(nm.ch || nm.h)}</b>${nm.ch ? ` <span class="muted">(${esc(nm.h)})</span>` : ""} — ${markup(t)}</li>` : ""; }).join("")}</ul></details></div>`;
    const mdPanel = (x, empty) => x ? `<div class="panel md">${md(x)}</div>` : `<div class="panel empty">${esc(empty)}</div>`;
    document.getElementById("t-me").innerHTML = mdPanel(B.me, "ТЗ не загружено.") + `<div class="panel">${SIGN}</div>`;
    document.getElementById("t-plot").innerHTML = mdPanel(B.plot, "Ход сюжета не загружен.");
    document.getElementById("t-grules").innerHTML = mdPanel(B.rules, "Правила игры не загружены.");
    // расписание
    const who = [{ id:"ilinka", name:"Илинка" }].concat(PLAYERS.map(p => ({ id:p.id, name: pname(p).ch || pname(p).h })));
    const groups = ["N1","N2","N3","N4",""];
    let sh = "";
    groups.forEach(g => { const list = (B.schedule || []).filter(e => (e.day || "") === g).sort(sortEv); if(!list.length) return;
      sh += `<div class="sec"><div class="ep">расписание</div><div class="t">${esc(NIGHTS[g] || "Вне ночей")}</div></div>` +
        list.map(e => evHTML(e, `${e.tz ? `<details class="tz"><summary>ТЗ</summary><div class="text">${markup(e.tz)}</div></details>` : ""}
          <div class="chips">${who.map(w => e.who && e.who[w.id] ? `<span class="chip${w.id==="ilinka"?" me":""}">${esc(w.name)}</span>` : "").join("")}</div>`)).join(""); });
    if(!sh) sh = `<div class="panel empty">Расписание пустое — добавь события в пульте.</div>`;
    const imp = B.imported;
    if(imp && imp.data){
      sh += `<div class="sec"><div class="ep">от мастеров</div><div class="t">${esc(imp.name || "Данные мастеров")}</div></div>` + importedHTML(imp.data);
    }
    document.getElementById("t-sched").innerHTML = sh;
    document.querySelectorAll("#nightbox .panel, #t-sched .panel").forEach((pn, i) => decorate(pn, (pn.closest(".frag")?.dataset.seed || "p") + i + VOICE, i));
    document.querySelectorAll(".head h1, #nightbox .card, .sec .t, #t-sched .card").forEach(letterize);
    sky(); schedule();
    document.getElementById("stamp").textContent = B.updated ? "обновлено " + new Date(B.updated).toLocaleString("ru-RU",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"}) : "";
  }
  function importedHTML(d){
    let items = Array.isArray(d) ? d : (d.events || d.items || d.schedule || d.data || Object.values(d).find(Array.isArray));
    if(!Array.isArray(items)) items = [d];
    const val = v => Array.isArray(v) ? v.map(x => typeof x === "object" ? JSON.stringify(x) : x).join(", ") : (v && typeof v === "object" ? JSON.stringify(v) : String(v ?? ""));
    const TITLE = ["title","name","название","event","ивент","событие"];
    return items.map(it => {
      if(typeof it !== "object" || !it) return `<div class="panel"><p>${esc(val(it))}</p></div>`;
      const tk = TITLE.find(k => it[k]); const rows = Object.entries(it).filter(([k]) => k !== tk);
      return `<div class="panel imp">${tk ? `<div class="card">${esc(val(it[tk]))}</div>` : ""}
        <dl>${rows.map(([k,v]) => `<dt>${esc(k)}</dt><dd>${esc(val(v))}</dd>`).join("")}</dl></div>`;
    }).join("");
  }

  async function load(){
    if(MODE === "primo"){ try{ await loadPrimo(); }catch(e){ if(!last) document.getElementById("t-me").innerHTML = `<div class="err">Не получилось открыть: ${esc(e.message)}</div>`; } return; }
    try{
      const r = await fetch("../data/"+SLUG+".json?t="+Date.now(), {cache:"no-store"});
      if(!r.ok) throw new Error(r.status);
      const txt = await r.text();
      if(txt === last) return;
      last = txt; data = JSON.parse(txt); render();
    }catch(e){
      if(!last) document.getElementById("t-frags").innerHTML = `<div class="err">Голос молчит. Обнови страницу позже.</div>`;
    }
  }

  shell(); lateCheck(); load();
  setInterval(load, POLL); setInterval(lateCheck, 60000);
  document.addEventListener("visibilitychange", () => { if(!document.hidden) load(); });
})();
