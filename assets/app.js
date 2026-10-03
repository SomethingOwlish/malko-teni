/* Тени над Дунаем — карточка Малкавиана. Данные: ../data/<slug>.json */
(function(){
  const root = document.documentElement;
  const SLUG = root.dataset.slug;
  const POLL = 60000;

  const VOICES = {
    euthymius:{ epithet:"Голос из-под переплёта", glyph:"✠",
      empty:"Лист чист. Здесь ещё ничего не записано.\nНо поля уже кто-то разлиновал.",
      fragTitle:"Списки", outTitle:"Последняя страница" },
    ashme:{ epithet:"Голос из сада пепла", glyph:"❦",
      empty:"Сад ещё не посажен. Пепел тёплый.\nКто-то ждёт, когда ты протянешь руки.",
      fragTitle:"Лепестки", outTitle:"Четвёртая ночь" },
    lane:{ epithet:"Голос со двора", glyph:"✎",
      empty:"Пока никто не водит. Считалочка не началась.\nНе выходи со двора.",
      fragTitle:"Правила игры", outTitle:"Последний кон" },
    prokhor:{ epithet:"Голос с паперти", glyph:"☩",
      empty:"Пусто, богатая, пусто!\nДураку нечего тебе дать. Пока.",
      fragTitle:"Подаяние", outTitle:"Четвёртая ночь" },
    tommazo:{ epithet:"Голос из протокола", glyph:"⚖",
      empty:"Протокол открыт. Показаний нет.\nТишина тоже записывается.",
      fragTitle:"Листы дела", outTitle:"Приговор" }
  };
  const V = VOICES[root.dataset.voice] || VOICES.euthymius;

  const LINK_ICONS = { masters:"✦", ilinka:"☾", chat:"⌘" };
  const NIGHTS = { N1:"Первая ночь", N2:"Вторая ночь", N3:"Третья ночь", N4:"Четвёртая ночь" };

  const CLAN = `
    <h2>Клан</h2>
    <ul class="clean">
      <li>В Нови-Саде клан Малкавиан — <b>секта судного дня</b>. В эту историю посвящены все. Играть в клан и не играть в неё нельзя.</li>
      <li>Клан — выше всего. Котерии меняются, князья сменяются, но пока у тебя есть клан, ты не один со своим безумием.</li>
      <li>Внутреннее важнее внешнего. Мысли и душа важнее фактов. Доверяй наитию, а не стройной логике.</li>
      <li>Наружу вы гордитесь безумием и смеётесь над теми, кто всё рационализирует. Не клоуны в плохом смысле.</li>
      <li>Клан вертит свой заговор. Окружающим не понравится, когда они узнают.</li>
      <li>Безумие — часть тебя и худший враг, страшнее Зверя. Его хочется с кем-то разделить. Эскалируй потихоньку.</li>
    </ul>`;

  const RULES = `
    <div class="panel">
      <h2>Встреча клана</h2>
      <p>Каждая ночь начинается со встречи клана по Зову. Примоген спрашивает о безумии прошлой ночи — ты рассказываешь и сдаёшь вчерашние карты.</p>
      <p>Затем тянешь из колоды карты на ночь (по умолчанию <b>5</b>):</p>
      <ul class="clean">
        <li><b>Одна — психоз ночи.</b> Отыгрываешь всю ночь, передать нельзя.</li>
        <li>Остальные можно отдать через <b>Помешательство 2</b>, через <b>Ауру безумия</b>, <b>сыграть самому</b> или <b>игнорировать</b>.</li>
        <li>По ходу ночи сообщай примогену о движении карт: «Зеркало — психоз ночи, Куклу передал Васе, Шорох сыграл сам».</li>
        <li>Показывать карточку или пересказывать её другому игроку нельзя.</li>
      </ul>
    </div>
    <div class="panel">
      <h2>Что делать с картами</h2>
      <h3>Помешательство 2</h3><p>Отдаёшь выбранную карточку цели, остальные остаются у тебя. Работает и на игротехов.</p>
      <h3>Аура безумия</h3><p>В любой момент передаёшь карточку другому игроку (не игротеху). Малкавиан обязан разыграть её этой ночью. Не-малкавиан — по желанию.</p>
      <h3>Сыграть самому</h3><p>Не меньше <b>10 минут</b>, и безумие должно повлиять на сцену: изменить ход, отношения, что-то ещё. В углу в одиночестве — не считается. Сыгранную карту больше нельзя передать.</p>
      <h3>Игнорировать</h3><p>Можно, если карту дал примоген, а не другой Малк. Ничего не делаешь — ничего не будет.</p>
      <p style="font-size:15px;color:var(--muted)">Цель «персонаж, который…» — это первый подошедший под условие, до конца эффекта. Психоз под конец ночи — скажи примогену и не сдавай: он перейдёт на следующую.</p>
    </div>
    <div class="panel">
      <h2>Сыграно → связь с Малкнетом</h2>
      <table class="rt">
        <tr><th>Сыграно*</th><th>Эффект</th></tr>
        <tr><td>1**</td><td>Тянешь 3 карты</td></tr>
        <tr><td>2</td><td>5 карт, +1 бумажка в Малкнете</td></tr>
        <tr><td>3</td><td>5 карт, сюжетное видение, +1 бонус</td></tr>
        <tr><td>4</td><td>7 карт, сюжетное видение, +2 бонуса</td></tr>
        <tr><td>5</td><td>7 карт, сюжетное видение, +2 бонуса, +1 бумажка</td></tr>
        <tr><td>6+</td><td>9 карт, видение (и ещё одно за пропуски), +3 бонуса</td></tr>
      </table>
      <p style="font-size:14px;color:var(--muted)">* любым способом: на себя, на других, дисциплиной. ** психоз ночи считается за 1.</p>
    </div>
    <div class="panel">
      <h2>Малкнет</h2>
      <ul class="clean">
        <li>Раз за ночь. Скажи примогену — придёшь в назначенное место примерно через 30 минут.</li>
        <li>Перед входом заяви бонусы на эту ночь (не копятся). «1 бонус» выбираешь сам.</li>
        <li>В комнате темно. Фонарик и телефон нельзя.</li>
        <li>Бумажки висят на верёвках. Сдёрнул или обрезал — всё, что ниже, забираешь. Подвязать обратно нельзя. С пола подбирать можно. Считаются бумажки, а не верёвки.</li>
        <li>Время вышло — выходишь. Бумажки твои, их нельзя отнять или украсть. Пустые бывают: сеть дело тонкое.</li>
        <li>Второй поход за ночь — примоген добавит тебе психоз, который нужно сыграть.</li>
      </ul>
    </div>
    <div class="panel" style="text-align:center">
      <h2>Стоп-слово</h2>
      <div class="stop">«Ананас»</div>
      <p style="margin-top:8px">Останавливает сцену, если происходящее невыносимо. Можно всегда выйти из некомфортного взаимодействия — примоген не будет держать зла. Если безумие делает больно тебе самому — поговори с примогеном, смени психоз, возьми таймаут.</p>
    </div>`;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const safeUrl = u => /^(https?:|tg:)/i.test(u||"") ? u : "#";
  const store = {
    get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } },
    set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  };

  let last = "", activeTab = store.get("malk-tab-"+SLUG) || "frags";

  function shell(){
    document.body.innerHTML = `
      <div class="wrap">
        <header class="head">
          <div class="epithet" id="epithet"></div>
          <h1 id="name">…</h1>
          <div class="sub" id="sub"></div>
        </header>
        <div id="notice"></div>
        <nav class="tabs" role="tablist">
          <button data-t="me">Я</button>
          <button data-t="frags">Осколки</button>
          <button data-t="rules">Правила</button>
        </nav>
        <section class="tab" id="t-me"></section>
        <section class="tab" id="t-frags"></section>
        <section class="tab" id="t-rules">${RULES}</section>
        <footer class="foot" id="links"></footer>
        <div class="stamp" id="stamp"></div>
      </div>`;
    document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => setTab(b.dataset.t));
    setTab(activeTab);
  }
  function setTab(t){
    activeTab = t; store.set("malk-tab-"+SLUG, t);
    document.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.t===t));
    document.querySelectorAll(".tab").forEach(s => s.classList.toggle("on", s.id==="t-"+t));
  }

  function fragHTML(f, seen){
    const isNew = seen && !seen.includes(f.id);
    return `<div class="frag${isNew?" new":""}"><div class="panel">
      <div class="meta"><span>${esc(NIGHTS[f.night]||f.night||"")}</span></div>
      <div class="card">${esc(f.card)}</div>
      ${f.audio ? `<audio controls preload="none" src="${esc(safeUrl(f.audio))}"></audio>` : ""}
      ${f.text ? `<details class="full"><summary>Целиком</summary><div class="text">${esc(f.text)}</div></details>` : ""}
    </div></div>`;
  }

  function render(d){
    const p = d.player || {};
    document.title = (p.character || "Малкавиан") + " — " + V.epithet;
    document.getElementById("epithet").textContent = p.showVoiceName && p.voiceName ? p.voiceName : V.epithet;
    document.getElementById("name").textContent = p.character || "—";
    document.getElementById("sub").textContent = "Малкавиан · Нови-Сад";

    document.getElementById("notice").innerHTML =
      [d.notice, p.notice].filter(Boolean).map(n => `<div class="notice">${esc(n)}</div>`).join("");

    // Я
    const arch = (title, a) => a && a.name ? `<div class="arch"><span style="color:var(--muted);font-size:13px">${title}</span><br><b>${esc(a.name)}</b>${a.text?`<p>${esc(a.text)}</p>`:""}${a.tags?`<div class="tags">${esc(a.tags)}</div>`:""}</div>` : "";
    document.getElementById("t-me").innerHTML = `
      <div class="panel">
        <h2>${esc(p.character||"Персонаж")}</h2>
        ${arch("Внешний архетип — роль в секте", p.external)}
        ${arch("Внутренний архетип — безумие", p.internal)}
        ${p.notes ? `<h3>Помни</h3><p style="white-space:pre-wrap">${esc(p.notes)}</p>` : ""}
      </div>
      <div class="panel">${CLAN}</div>`;

    // Осколки
    const seen = store.get("malk-seen-"+SLUG);
    const frags = (d.fragments||[]).slice().sort((a,b)=>(a.n||0)-(b.n||0));
    const outs = d.outcomes||[], extra = d.extra||[];
    let h = "";
    if(!frags.length && !outs.length && !extra.length){
      h = `<div class="panel empty"><span class="glyph">${V.glyph}</span>${esc(V.empty).replace(/\n/g,"<br>")}</div>`;
    } else {
      if(frags.length) h += `<div class="sec-title">${V.fragTitle} · ${frags.length}</div>` + frags.map(f=>fragHTML(f,seen)).join("");
      if(outs.length) h += `<div class="sec-title">${V.outTitle}</div>` + outs.map(o=>fragHTML({id:o.id,night:"N4",card:o.label,text:o.text,audio:o.audio},seen)).join("");
      if(extra.length) h += `<div class="sec-title">Шум Сети</div>` + extra.map(x=>fragHTML({id:x.id,night:x.night||"",card:x.title,text:x.text,audio:x.audio},seen)).join("");
    }
    document.getElementById("t-frags").innerHTML = h;
    const ids = frags.map(f=>f.id).concat(outs.map(o=>o.id), extra.map(x=>x.id));
    // помечаем «новое» до следующего захода
    setTimeout(()=>store.set("malk-seen-"+SLUG, ids), 4000);

    // ссылки
    const L = d.links||{};
    document.getElementById("links").innerHTML = ["masters","ilinka","chat"]
      .filter(k => L[k] && L[k].show && L[k].url)
      .map(k => `<a href="${esc(safeUrl(L[k].url))}" target="_blank" rel="noopener">${LINK_ICONS[k]} ${esc(L[k].label||k)}</a>`).join("");
    document.getElementById("stamp").textContent = d.updated ? "обновлено " + new Date(d.updated).toLocaleString("ru-RU",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"}) : "";
  }

  async function load(){
    try{
      const r = await fetch("../data/"+SLUG+".json?t="+Date.now(), {cache:"no-store"});
      if(!r.ok) throw new Error(r.status);
      const txt = await r.text();
      if(txt === last) return;
      last = txt;
      render(JSON.parse(txt));
    }catch(e){
      if(!last) document.getElementById("t-frags").innerHTML = `<div class="err">Голос молчит. Обнови страницу позже.</div>`;
    }
  }

  shell(); load(); setInterval(load, POLL);
  document.addEventListener("visibilitychange", () => { if(!document.hidden) load(); });
})();
