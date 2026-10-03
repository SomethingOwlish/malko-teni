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
      whispers:["записано","свидетель","покайся","протокол","молчание","приговор","внесено в дело"] }
  };
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
      <p style="margin-top:8px">Останавливает сцену, если происходящее невыносимо. Можно всегда выйти из некомфортного взаимодействия — примоген не будет держать зла. Если безумие делает больно тебе самому — поговори с примогеном, смени психоз, возьми таймаут.</p></div>`;

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
  const night = () => { const q = qs.get("night"); const n = q!==null ? +q : (data && +data.night) || 0; return Math.max(0, Math.min(4, n)); };

  function shell(){
    document.body.innerHTML = `
      <div class="sky" id="sky"></div>
      <div class="wrap">
        <header class="head">
          <span class="clan">${CLAN_SIGN}</span>
          <div class="mark" id="mark"></div>
          <div class="epithet" id="epithet"></div>
          <h1 id="name">…</h1>
          <div class="sub">Малкавиан · Нови-Сад</div>
          <div class="late-line">${esc(V.late)}</div>
        </header>
        <div id="notice"></div>
        <nav class="tabs" role="tablist">
          <button data-t="me">Я</button><button data-t="frags">Осколки</button><button data-t="rules">Правила</button>
        </nav>
        <section class="tab" id="t-me"></section>
        <section class="tab" id="t-frags"></section>
        <section class="tab" id="t-rules">${RULES}</section>
        <footer class="foot" id="links"></footer>
        <div class="stamp-time" id="stamp"></div>
        <span class="foot-clan">${CLAN_SIGN}</span>
      </div>`;
    document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => setTab(b.dataset.t));
    document.addEventListener("click", e => { const m = e.target.closest("mark.hid"); if(m) m.classList.toggle("shown"); });
    setTab(activeTab);
  }
  function setTab(t){
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

  function render(){
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
    const ids = frags.map(f=>f.id).concat(outs.map(o=>o.id), extra.map(x=>x.id));
    setTimeout(()=>store.set("malk-seen-"+SLUG, ids), 4000);

    document.querySelectorAll(".tab .panel").forEach((pn, i) => decorate(pn, (pn.closest(".frag")?.dataset.seed || "p") + i + VOICE, i));
    document.querySelectorAll(".head h1, .frag .card, .sec .t, .panel h2").forEach(letterize);
    if(VOICE==="euthymius") document.querySelectorAll(".frag .card").forEach(c => { const f = c.querySelector(".ch"); if(f) f.classList.add("cap"); });
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

  async function load(){
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
