/* Панель мастера: галочки → data/<slug>.json → GitHub */
(function(){
  const PLAYERS = window.MALK_PLAYERS; // [{id, slug, voice, title}]
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ls = {
    get(k,d){ try{ const v = localStorage.getItem(k); return v==null ? d : JSON.parse(v); }catch(e){ return d; } },
    set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  };
  const VOICE_NAMES = { euthymius:"Евфимий", ashme:"Ашме", lane:"Лане", prokhor:"Прохор", tommazo:"Томмазо" };
  const DEFAULT_LINKS = {
    masters:{ label:"Мастера", url:"", show:false },
    ilinka:{ label:"Илинка", url:"https://t.me/SomethingOwlish", show:true },
    chat:{ label:"Клановый чат", url:"", show:false }
  };

  let LIB = ls.get("malk-lib", null);
  let GH = ls.get("malk-gh", { owner:"", repo:"", branch:"main", token:"" });
  let M = { links: structuredClone(DEFAULT_LINKS), notice:"", players:{} };
  let published = {};   // slug -> {text, sha}
  let cur = PLAYERS[0].id;

  /* ---------- модель ---------- */
  function blankPlayer(p){
    const d = LIB && LIB.players && LIB.players[p.id] || {};
    const archText = (kind,name) => LIB && LIB.archetypes && LIB.archetypes[kind] && LIB.archetypes[kind][name] || "";
    return {
      character: d.character || "", notes:"", notice:"",
      voiceName: LIB && LIB.voices[p.voice] ? LIB.voices[p.voice].name : VOICE_NAMES[p.voice],
      showVoiceName:false,
      external:{ name:d.external||"", text:archText("external", d.external) },
      internal:{ name:d.internal||"", text:archText("internal", d.internal) },
      frag:{}, out:{}, extra:[], cache:{}
    };
  }
  function fromPublished(p, data){
    const m = blankPlayer(p);
    if(!data) return m;
    const pl = data.player || {};
    Object.assign(m, {
      character: pl.character ?? m.character, notes: pl.notes||"", notice: pl.notice||"",
      voiceName: pl.voiceName || m.voiceName, showVoiceName: !!pl.showVoiceName,
      external: pl.external || m.external, internal: pl.internal || m.internal,
      extra: (data.extra||[]).map(x=>({...x}))
    });
    (data.fragments||[]).forEach(f => { m.frag[f.id] = { on:true, full:!!f.text, audio:f.audio||"" }; m.cache[f.id] = f; });
    (data.outcomes||[]).forEach(o => { m.out[o.id] = { on:true, full:!!o.text, audio:o.audio||"" }; m.cache[o.id] = o; });
    return m;
  }

  function buildFile(p){
    const m = M.players[p.id], v = LIB && LIB.voices[p.voice];
    const fr = [], oc = [];
    const libFr = v ? v.fragments : [], libOut = v ? v.outcomes : [];
    const fById = id => libFr.find(f=>f.id===id) || m.cache[id];
    const oById = id => libOut.find(o=>o.id===id) || m.cache[id];
    Object.entries(m.frag).forEach(([id,s]) => {
      if(!s.on) return; const f = fById(id); if(!f) return;
      const o = { id, n:f.n, night:f.night, card:f.card };
      if(s.full && f.text) o.text = f.text;
      if(s.audio) o.audio = s.audio;
      fr.push(o);
    });
    Object.entries(m.out).forEach(([id,s]) => {
      if(!s.on) return; const f = oById(id); if(!f) return;
      const o = { id, label:f.label };
      if(s.full && f.text) o.text = f.text;
      if(s.audio) o.audio = s.audio;
      oc.push(o);
    });
    fr.sort((a,b)=>a.n-b.n);
    oc.sort((a,b)=>a.id.localeCompare(b.id));
    return {
      notice: M.notice || "",
      links: M.links,
      player: { character:m.character, voiceName:m.voiceName, showVoiceName:m.showVoiceName,
                external:m.external, internal:m.internal, notes:m.notes, notice:m.notice },
      fragments: fr, outcomes: oc,
      extra: m.extra.filter(x=>x.title||x.text).map((x,i)=>({ id:x.id||("x"+Date.now()+i), night:x.night||"", title:x.title||"", text:x.text||"", audio:x.audio||"" }))
    };
  }
  const saveDraft = () => ls.set("malk-draft", M);

  /* ---------- GitHub ---------- */
  const b64 = s => { const b = new TextEncoder().encode(s); let r=""; b.forEach(x=>r+=String.fromCharCode(x)); return btoa(r); };
  const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g,"")), c=>c.charCodeAt(0)));
  const api = (path, opt={}) => fetch(`https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${path}`+(opt.method?"":`?ref=${encodeURIComponent(GH.branch)}`), {
    ...opt, headers:{ "Accept":"application/vnd.github+json", "Authorization":"Bearer "+GH.token, ...(opt.headers||{}) }
  });
  const ghReady = () => GH.owner && GH.repo && GH.token;

  async function fetchPublished(slug){
    if(ghReady()){
      const r = await api(`data/${slug}.json`);
      if(r.status===404) return null;
      if(!r.ok) throw new Error("GitHub "+r.status);
      const j = await r.json();
      const text = unb64(j.content);
      published[slug] = { text, sha:j.sha };
      return JSON.parse(text);
    }
    const r = await fetch(`../data/${slug}.json?t=${Date.now()}`, {cache:"no-store"});
    if(!r.ok) return null;
    const text = await r.text();
    published[slug] = { text, sha:null };
    return JSON.parse(text);
  }

  async function loadAll(){
    status("Читаю опубликованное…");
    try{
      let newest = null;
      for(const p of PLAYERS){
        const data = await fetchPublished(p.slug);
        M.players[p.id] = fromPublished(p, data);
        if(data && (!newest || (data.updated||"") > (newest.updated||""))) newest = data;
      }
      if(newest){ M.links = { ...structuredClone(DEFAULT_LINKS), ...(newest.links||{}) }; M.notice = newest.notice || ""; }
      saveDraft(); status("Загружено то, что сейчас видят игроки.", "ok");
    }catch(e){ status("Не удалось прочитать: "+e.message, "bad"); }
    render();
  }

  const strip = o => { const c = {...o}; delete c.updated; return JSON.stringify(c); };

  async function publish(){
    if(!ghReady()) return status("Заполни GitHub: владелец, репозиторий, токен.", "bad");
    status("Публикую…");
    let n = 0;
    try{
      for(const p of PLAYERS){
        const body = buildFile(p);
        const prev = published[p.slug] && published[p.slug].text;
        if(prev){ try{ if(strip(JSON.parse(prev)) === strip(body)) continue; }catch(e){} }
        body.updated = new Date().toISOString();
        const text = JSON.stringify(body, null, 1);
        // свежий sha
        let sha = null;
        const g = await api(`data/${p.slug}.json`);
        if(g.ok) sha = (await g.json()).sha;
        const r = await api(`data/${p.slug}.json`, { method:"PUT", body: JSON.stringify({
          message:`Малки: ${p.title} — обновление карточки`, content:b64(text), branch:GH.branch, ...(sha?{sha}:{})
        })});
        if(!r.ok) throw new Error(`${p.title}: GitHub ${r.status} ${(await r.json().catch(()=>({}))).message||""}`);
        published[p.slug] = { text, sha:(await r.json()).content.sha };
        n++;
      }
      status(n ? `Опубликовано карточек: ${n}. Игроки увидят через 1–2 минуты.` : "Изменений нет — нечего публиковать.", "ok");
    }catch(e){ status("Ошибка: "+e.message, "bad"); }
    render();
  }

  function dirty(p){
    const prev = published[p.slug] && published[p.slug].text;
    if(!prev) return true;
    try{ return strip(JSON.parse(prev)) !== strip(buildFile(p)); }catch(e){ return true; }
  }

  /* ---------- UI ---------- */
  function status(t, cls){ const s=$("#status"); s.textContent=t; s.className="status "+(cls||""); }

  function archSelect(kind, val){
    const names = LIB && LIB.archetypes ? Object.keys(LIB.archetypes[kind]) : [];
    if(val && !names.includes(val)) names.push(val);
    return `<select data-arch="${kind}"><option value="">— нет —</option>${names.map(n=>`<option ${n===val?"selected":""}>${esc(n)}</option>`).join("")}</select>`;
  }

  function itemRow(kind, f, s){
    const title = kind==="frag" ? `<span class="pill">${esc(f.night)}</span> <span class="pill ${f.kind==="гарантированный"?"g":""}">${esc(f.kind||"")}</span> <b>№${f.n}</b>` : `<b>${esc(f.label)}</b>`;
    const body = kind==="frag" ? f.card : f.text;
    return `<div class="item ${s.on?"on":""}" data-kind="${kind}" data-id="${esc(f.id)}">
      <label class="chk big"><input type="checkbox" data-f="on" ${s.on?"checked":""}> показать</label>
      <div class="ibody">
        <div class="ititle">${title}</div>
        <div class="icard">${esc(body)}</div>
        <div class="iopts">
          <label class="chk"><input type="checkbox" data-f="full" ${s.full?"checked":""}> полный текст</label>
          <input type="url" data-f="audio" placeholder="ссылка на аудио (mp3)" value="${esc(s.audio||"")}">
          ${f.text ? `<details><summary>текст</summary><div class="ftext">${esc(f.text)}</div></details>` : ""}
        </div>
      </div>
    </div>`;
  }

  function render(){
    const base = location.href.replace(/[^/]*\/[^/]*$/,"");
    $("#tabs").innerHTML = PLAYERS.map(p => {
      const m = M.players[p.id]; const cnt = m ? Object.values(m.frag).filter(s=>s.on).length : 0;
      return `<button class="${p.id===cur?"cur":""}" data-p="${p.id}">${esc(p.title)}<small>${VOICE_NAMES[p.voice]} · ${cnt}/7${m&&dirty(p)?" ●":""}</small></button>`;
    }).join("") + `<button class="${cur==="_links"?"cur":""}" data-p="_links">Ссылки<small>и общее</small></button>`;
    $("#tabs").querySelectorAll("button").forEach(b => b.onclick = () => { cur = b.dataset.p; render(); });

    $("#libstate").innerHTML = LIB ? `Библиотека загружена: ${Object.values(LIB.voices).reduce((a,v)=>a+v.fragments.length,0)} фрагментов.` : `<b>Библиотека не загружена</b> — видны только уже опубликованные осколки.`;

    const main = $("#main");
    if(cur === "_links"){
      main.innerHTML = `<div class="box"><h2>Ссылки внизу каждой карточки</h2>
        ${["masters","ilinka","chat"].map(k=>{ const L=M.links[k]||{}; return `<div class="row link" data-l="${k}">
          <label class="chk big"><input type="checkbox" data-lf="show" ${L.show?"checked":""}> показывать</label>
          <input data-lf="label" value="${esc(L.label)}" placeholder="подпись">
          <input data-lf="url" type="url" value="${esc(L.url)}" placeholder="https://t.me/...">
        </div>`; }).join("")}
        <h2>Объявление для всех</h2>
        <textarea id="gnotice" rows="3" placeholder="Будет сверху у всех пятерых. Пусто — не видно.">${esc(M.notice)}</textarea>
        <h2>Адреса карточек</h2>
        <ul class="urls">${PLAYERS.map(p=>`<li><b>${esc(p.title)}</b> — <a href="${base}${p.slug}/" target="_blank">${base}${p.slug}/</a></li>`).join("")}</ul>
      </div>`;
      main.querySelectorAll("[data-lf]").forEach(inp => inp.oninput = inp.onchange = () => {
        const k = inp.closest("[data-l]").dataset.l; M.links[k] = M.links[k]||{};
        M.links[k][inp.dataset.lf] = inp.type==="checkbox" ? inp.checked : inp.value; saveDraft(); renderTabsOnly();
      });
      $("#gnotice").oninput = e => { M.notice = e.target.value; saveDraft(); renderTabsOnly(); };
      return;
    }

    const p = PLAYERS.find(x=>x.id===cur), m = M.players[p.id];
    if(!m){ main.innerHTML = `<div class="box">Загрузка…</div>`; return; }
    const v = LIB && LIB.voices[p.voice];
    const frs = v ? v.fragments : Object.values(m.cache).filter(x=>x.card!==undefined && x.n!==undefined);
    const outs = v ? v.outcomes : Object.values(m.cache).filter(x=>x.label!==undefined);
    const ensure = (map,id) => map[id] || (map[id] = { on:false, full:false, audio:"" });

    main.innerHTML = `
      <div class="box">
        <div class="pagehead"><h2>${esc(p.title)} · голос ${VOICE_NAMES[p.voice]}</h2>
          <a class="btn ghost" href="${base}${p.slug}/" target="_blank">Открыть карточку ↗</a></div>
        <div class="grid2">
          <label>Имя персонажа<input data-pf="character" value="${esc(m.character)}"></label>
          <label>Имя голоса<input data-pf="voiceName" value="${esc(m.voiceName)}"><span class="chk"><input type="checkbox" data-pf="showVoiceName" ${m.showVoiceName?"checked":""}> показать игроку вместо эпитета</span></label>
          <label>Внешний архетип ${archSelect("external", m.external.name)}</label>
          <label>Внутренний архетип ${archSelect("internal", m.internal.name)}</label>
        </div>
        <label>Описание внешнего<textarea data-at="external" rows="2">${esc(m.external.text)}</textarea></label>
        <label>Описание внутреннего<textarea data-at="internal" rows="2">${esc(m.internal.text)}</textarea></label>
        <label>Напоминалка («Помни») — личное для игрока<textarea data-pf="notes" rows="2">${esc(m.notes)}</textarea></label>
        <label>Объявление только для этого игрока<textarea data-pf="notice" rows="2">${esc(m.notice)}</textarea></label>
      </div>
      <div class="box"><h2>Осколки голоса</h2>${frs.length ? frs.map(f=>itemRow("frag", f, ensure(m.frag,f.id))).join("") : `<p class="muted">Загрузи библиотеку, чтобы увидеть все фрагменты.</p>`}</div>
      <div class="box"><h2>Карточки четвёртой ночи</h2>${outs.map(o=>itemRow("out", o, ensure(m.out,o.id))).join("") || `<p class="muted">—</p>`}</div>
      <div class="box"><h2>Шум Сети и прочие видения</h2>
        <p class="muted">Видения других мастеров, Малкнет, личные вбросы — всё, что не из библиотеки.</p>
        <div id="extras">${m.extra.map((x,i)=>`<div class="extra" data-i="${i}">
          <div class="grid2"><input data-xf="title" placeholder="заголовок / короткая карта" value="${esc(x.title)}">
          <select data-xf="night">${["","N1","N2","N3","N4"].map(n=>`<option ${x.night===n?"selected":""} value="${n}">${n||"без ночи"}</option>`).join("")}</select></div>
          <textarea data-xf="text" rows="3" placeholder="полный текст (необязательно)">${esc(x.text)}</textarea>
          <div class="grid2"><input data-xf="audio" type="url" placeholder="аудио (необязательно)" value="${esc(x.audio)}"><button class="btn ghost" data-xdel>Убрать</button></div>
        </div>`).join("")}</div>
        <button class="btn ghost" id="xadd">+ Добавить видение</button>
      </div>`;

    main.querySelectorAll("[data-pf]").forEach(inp => inp.oninput = inp.onchange = () => {
      m[inp.dataset.pf] = inp.type==="checkbox" ? inp.checked : inp.value; saveDraft(); renderTabsOnly(); });
    main.querySelectorAll("[data-arch]").forEach(sel => sel.onchange = () => {
      const k = sel.dataset.arch; m[k] = { name:sel.value, text: LIB && LIB.archetypes[k][sel.value] || "" }; saveDraft(); render(); });
    main.querySelectorAll("[data-at]").forEach(t => t.oninput = () => { m[t.dataset.at].text = t.value; saveDraft(); renderTabsOnly(); });
    main.querySelectorAll(".item").forEach(row => {
      const map = row.dataset.kind==="frag" ? m.frag : m.out, s = ensure(map,row.dataset.id);
      row.querySelectorAll("[data-f]").forEach(inp => inp.oninput = inp.onchange = () => {
        s[inp.dataset.f] = inp.type==="checkbox" ? inp.checked : inp.value;
        if(inp.dataset.f!=="on" && inp.type==="checkbox" && inp.checked) s.on = true;
        if(inp.dataset.f==="on" && inp.checked && !s.audio) s.full = true;
        row.classList.toggle("on", s.on); row.querySelector('[data-f=on]').checked = s.on;
        row.querySelector('[data-f=full]').checked = s.full;
        saveDraft(); renderTabsOnly(); });
    });
    main.querySelectorAll(".extra").forEach(row => {
      const x = m.extra[+row.dataset.i];
      row.querySelectorAll("[data-xf]").forEach(inp => inp.oninput = inp.onchange = () => { x[inp.dataset.xf] = inp.value; saveDraft(); renderTabsOnly(); });
      row.querySelector("[data-xdel]").onclick = () => { m.extra.splice(+row.dataset.i,1); saveDraft(); render(); };
    });
    $("#xadd").onclick = () => { m.extra.push({ id:"x"+Date.now(), title:"", text:"", night:"", audio:"" }); saveDraft(); render(); };
  }
  function renderTabsOnly(){
    $("#tabs").querySelectorAll("button[data-p]").forEach(b => {
      const p = PLAYERS.find(x=>x.id===b.dataset.p); if(!p) return;
      const m = M.players[p.id]; const cnt = Object.values(m.frag).filter(s=>s.on).length;
      b.querySelector("small").textContent = `${VOICE_NAMES[p.voice]} · ${cnt}/7${dirty(p)?" ●":""}`;
    });
  }

  /* ---------- настройки ---------- */
  function initSettings(){
    ["owner","repo","branch","token"].forEach(k => {
      const i = $("#gh-"+k); i.value = GH[k]||"";
      i.onchange = () => { GH[k] = i.value.trim(); ls.set("malk-gh", GH); };
    });
    $("#libfile").onchange = async e => {
      const f = e.target.files[0]; if(!f) return;
      try{ LIB = JSON.parse(await f.text()); ls.set("malk-lib", LIB);
        PLAYERS.forEach(p => { const m = M.players[p.id]; if(m && !m.character && LIB.players[p.id]) m.character = LIB.players[p.id].character; });
        status("Библиотека загружена и сохранена в этом браузере.","ok"); render();
      }catch(err){ status("Это не library.json: "+err.message,"bad"); }
    };
    $("#reload").onclick = () => { if(confirmLoss()) loadAll(); };
    $("#publish").onclick = publish;
    $("#forget").onclick = () => { try{ localStorage.removeItem("malk-lib"); localStorage.removeItem("malk-gh"); localStorage.removeItem("malk-draft"); }catch(e){} location.reload(); };
  }
  function confirmLoss(){ return !PLAYERS.some(dirty) || window.confirm("Есть неопубликованные изменения. Перечитать с сайта и потерять их?"); }

  initSettings();
  const draft = ls.get("malk-draft", null);
  (async () => {
    for(const p of PLAYERS){ try{ await fetchPublished(p.slug); }catch(e){} }
    if(draft && draft.players && PLAYERS.every(p=>draft.players[p.id])){
      M = draft; status("Восстановлен черновик из этого браузера. ● — есть неопубликованное.","ok"); render();
    } else loadAll();
  })();
})();
