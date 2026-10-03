/* Пульт Малкавиан v3: вход по паролю (с телефона), роли «координатор» и «мастер». */
(function(){
  const PLAYERS = window.MALK_PLAYERS; // [{id, slug, voice, title}]
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ls = {
    get(k,d){ try{ const v = localStorage.getItem(k); return v==null ? d : JSON.parse(v); }catch(e){ return d; } },
    set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
    del(k){ try{ localStorage.removeItem(k); }catch(e){} }
  };
  const ss = {
    get(k){ try{ return JSON.parse(sessionStorage.getItem(k)); }catch(e){ return null; } },
    set(k,v){ try{ sessionStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
    del(k){ try{ sessionStorage.removeItem(k); }catch(e){} }
  };
  const VOICE_NAMES = { euthymius:"Евфимий", ashme:"Ашме", lane:"Лане", prokhor:"Прохор", tommazo:"Томмазо" };
  const DEFAULT_LINKS = {
    masters:{ label:"Мастера", url:"", show:false },
    ilinka:{ label:"Илинка", url:"https://t.me/SomethingOwlish", show:true },
    chat:{ label:"Клановый чат", url:"", show:false }
  };
  const VAULT = "data/vault.json";
  const ITER = 250000;

  /* ================= шифрование ================= */
  const te = new TextEncoder(), td = new TextDecoder();
  const b64e = buf => { const b = new Uint8Array(buf); let s = ""; for(let i=0;i<b.length;i+=0x8000) s += String.fromCharCode.apply(null, b.subarray(i,i+0x8000)); return btoa(s); };
  const b64d = s => Uint8Array.from(atob(s.replace(/\s/g,"")), c => c.charCodeAt(0));
  async function deriveKey(pw, salt){
    const base = await crypto.subtle.importKey("raw", te.encode(pw), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name:"PBKDF2", salt, iterations:ITER, hash:"SHA-256" }, base, { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]);
  }
  async function seal(key, obj){
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, te.encode(JSON.stringify(obj)));
    return { iv:b64e(iv), ct:b64e(ct) };
  }
  async function unseal(key, box){
    const pt = await crypto.subtle.decrypt({ name:"AES-GCM", iv:b64d(box.iv) }, key, b64d(box.ct));
    return JSON.parse(td.decode(pt));
  }

  /* ================= GitHub ================= */
  let S = null; // сессия: {owner, repo, branch, token, role, name}
  const utf8b64 = s => b64e(te.encode(s));
  const fromB64 = s => td.decode(b64d(s));
  const api = (path, opt={}) => fetch(`https://api.github.com/repos/${S.owner}/${S.repo}/contents/${path}` + (opt.method ? "" : `?ref=${encodeURIComponent(S.branch)}&t=${Date.now()}`), {
    cache:"no-store", ...opt, headers:{ "Accept":"application/vnd.github+json", "Authorization":"Bearer "+S.token, ...(opt.headers||{}) }
  });
  async function getFile(path){
    const r = await api(path);
    if(r.status === 404) return { data:null, sha:null };
    if(r.status === 401) throw new Error("GitHub не принял токен. Координатору: перевыпустить ключи.");
    if(!r.ok) throw new Error("GitHub " + r.status);
    const j = await r.json();
    return { data: JSON.parse(fromB64(j.content)), sha: j.sha };
  }
  /* GitHub несколько секунд после записи может отдавать старую версию файла — помним то, что записали сами */
  const known = {};
  async function putFile(path, obj, sha, msg){
    const r = await api(path, { method:"PUT", body: JSON.stringify({ message:msg, content:utf8b64(JSON.stringify(obj, null, 1)), branch:S.branch, ...(sha?{sha}:{}) }) });
    if(r.status === 409 || (r.status === 422 && /sha/i.test(await r.clone().text()))) return { conflict:true };
    if(!r.ok) throw new Error(`GitHub ${r.status} ${(await r.json().catch(()=>({}))).message||""}`);
    const nsha = (await r.json()).content.sha;
    known[path] = { sha:nsha, data:obj, t:Date.now() };
    return { sha:nsha };
  }
  /* читать-изменить-записать с повтором: безопасно, когда правят несколько мастеров сразу */
  async function mutate(path, fn, msg){
    for(let attempt=0; attempt<5; attempt++){
      let { data, sha } = await getFile(path);
      const k = known[path];
      if(attempt === 0 && k && sha !== k.sha && Date.now() - k.t < 180000){ data = k.data; sha = k.sha; }
      const before = JSON.stringify(data);
      const next = fn(data ? JSON.parse(before) : null);
      if(next == null || JSON.stringify(next) === before) return data;
      next.updated = new Date().toISOString();
      const r = await putFile(path, next, sha, msg);
      if(!r.conflict){ remote[path] = next; return next; }
      delete known[path];
      await new Promise(res => setTimeout(res, 1200 * (attempt + 1) + Math.random()*800));
    }
    throw new Error("GitHub ещё не обновился или кто-то правит этот файл одновременно. Подожди полминуты и нажми ещё раз.");
  }

  /* ================= данные ================= */
  let LIB = null;
  let remote = {};          // path -> опубликованные данные
  let M = null;             // модель координатора
  let cur = null;
  const pathOf = p => `data/${p.slug}.json`;

  function blankPlayer(p){
    const d = LIB && LIB.players && LIB.players[p.id] || {};
    const at = (kind,name) => LIB && LIB.archetypes && LIB.archetypes[kind] && LIB.archetypes[kind][name] || "";
    return { character:d.character||"", notes:"", notice:"",
      voiceName: LIB && LIB.voices[p.voice] ? LIB.voices[p.voice].name : VOICE_NAMES[p.voice], showVoiceName:false,
      external:{ name:d.external||"", text:at("external", d.external) }, internal:{ name:d.internal||"", text:at("internal", d.internal) },
      frag:{}, out:{}, cache:{} };
  }
  function fromPublished(p, data){
    const m = blankPlayer(p); if(!data) return m;
    const pl = data.player || {};
    Object.assign(m, { character: pl.character ?? m.character, notes:pl.notes||"", notice:pl.notice||"",
      voiceName: pl.voiceName || m.voiceName, showVoiceName: !!pl.showVoiceName,
      external: pl.external || m.external, internal: pl.internal || m.internal });
    (data.fragments||[]).forEach(f => { m.frag[f.id] = { on:true, full:!!f.text, audio:f.audio||"" }; m.cache[f.id] = f; });
    (data.outcomes||[]).forEach(o => { m.out[o.id] = { on:true, full:!!o.text, audio:o.audio||"" }; m.cache[o.id] = o; });
    return m;
  }
  function modelFromRemote(){
    const model = { links: structuredClone(DEFAULT_LINKS), notice:"", night:0, players:{} };
    let newest = null;
    PLAYERS.forEach(p => { const d = remote[pathOf(p)]; model.players[p.id] = fromPublished(p, d);
      if(d && (!newest || (d.updated||"") > (newest.updated||""))) newest = d; });
    if(newest){ model.links = { ...model.links, ...(newest.links||{}) }; model.notice = newest.notice||""; model.night = +newest.night||0; }
    return model;
  }
  /* то, чем управляет координатор (без видений — они живут отдельно и сохраняются сразу) */
  function buildCore(p){
    const m = M.players[p.id], v = LIB && LIB.voices[p.voice];
    const libFr = v ? v.fragments : [], libOut = v ? v.outcomes : [];
    const fr = [], oc = [];
    Object.entries(m.frag).forEach(([id,s]) => { if(!s.on) return; const f = libFr.find(x=>x.id===id) || m.cache[id]; if(!f) return;
      const o = { id, n:f.n, night:f.night, card:f.card }; if(s.full && f.text) o.text = f.text; if(s.audio) o.audio = s.audio; fr.push(o); });
    Object.entries(m.out).forEach(([id,s]) => { if(!s.on) return; const f = libOut.find(x=>x.id===id) || m.cache[id]; if(!f) return;
      const o = { id, label:f.label }; if(s.full && f.text) o.text = f.text; if(s.audio) o.audio = s.audio; oc.push(o); });
    fr.sort((a,b)=>a.n-b.n); oc.sort((a,b)=>a.id.localeCompare(b.id));
    return { night:+M.night||0, notice:M.notice||"", links:M.links,
      player:{ character:m.character, voiceName:m.voiceName, showVoiceName:m.showVoiceName, external:m.external, internal:m.internal, notes:m.notes, notice:m.notice },
      fragments:fr, outcomes:oc };
  }
  const core = d => { if(!d) return ""; const c = {...d}; delete c.updated; delete c.extra; return JSON.stringify(c); };
  const dirty = p => core(remote[pathOf(p)]) !== core(buildCore(p));
  const saveDraft = () => ls.set("malk-draft", M);

  async function loadRemote(){
    status("Читаю, что сейчас видят игроки…");
    for(const p of PLAYERS){ const path = pathOf(p); const { data, sha } = await getFile(path); const k = known[path];
      remote[path] = (k && sha !== k.sha && Date.now() - k.t < 180000) ? k.data : data; }
    status("");
  }

  async function publish(){
    status("Публикую…"); let n = 0;
    try{
      for(const p of PLAYERS){
        if(!dirty(p)) continue;
        const body = buildCore(p);
        await mutate(pathOf(p), d => ({ ...body, extra:(d && d.extra) || [] }), `Малки: ${p.title} — карточка`);
        n++;
      }
      status(n ? `Опубликовано карточек: ${n}. Игроки увидят через 1–2 минуты.` : "Изменений нет.", "ok");
    }catch(e){ status("Ошибка: "+e.message, "bad"); }
    render();
  }

  /* ================= видения (общие для координатора и мастеров) ================= */
  function allExtras(){
    const map = new Map();
    PLAYERS.forEach(p => ((remote[pathOf(p)]||{}).extra||[]).forEach(x => {
      if(!map.has(x.id)) map.set(x.id, { ...x, to:[] });
      map.get(x.id).to.push(p.id);
    }));
    return [...map.values()].sort((a,b)=>(b.at||"").localeCompare(a.at||""));
  }
  async function saveExtra(x, to){
    const ids = new Set(to);
    for(const p of PLAYERS){
      const want = ids.has(p.id);
      const has = ((remote[pathOf(p)]||{}).extra||[]).some(e => e.id === x.id);
      if(!want && !has) continue;
      await mutate(pathOf(p), d => {
        d = d || {}; const ex = (d.extra||[]).filter(e => e.id !== x.id);
        if(want) ex.push(x);
        d.extra = ex; return d;
      }, `Видение «${(x.title||"").slice(0,40)}» — ${p.title}`);
    }
  }

  /* ================= интерфейс ================= */
  function status(t, cls){ const s = $("#status"); if(s){ s.textContent = t; s.className = "status " + (cls||""); } }
  const show = id => ["loginView","setupView","appView"].forEach(v => $("#"+v).classList.toggle("hide", v !== id));
  const charName = p => (M && M.players[p.id] && M.players[p.id].character) || ((remote[pathOf(p)]||{}).player||{}).character || p.title;

  function render(){
    const coord = S.role === "coord";
    document.querySelectorAll(".coord-only").forEach(e => e.classList.toggle("hide", !coord));
    $("#roleBadge").textContent = coord ? "координатор" : "мастер" + (S.name ? " · " + S.name : "");
    if(coord) $("#night").value = String(+M.night||0);
    if(!cur) cur = coord ? PLAYERS[0].id : "_ev";

    let tabs = "";
    if(coord) tabs += PLAYERS.map(p => { const m = M.players[p.id]; const cnt = Object.values(m.frag).filter(s=>s.on).length;
      return `<button class="${p.id===cur?"cur":""}" data-p="${p.id}">${esc(p.title)}<small>${VOICE_NAMES[p.voice]} · ${cnt}/7${dirty(p)?" ●":""}</small></button>`; }).join("");
    tabs += `<button class="${cur==="_ev"?"cur":""}" data-p="_ev">Видения<small>и ивенты</small></button>`;
    if(coord) tabs += `<button class="${cur==="_links"?"cur":""}" data-p="_links">Ссылки<small>и общее</small></button><button class="${cur==="_keys"?"cur":""}" data-p="_keys">Ключи<small>пароли</small></button>`;
    $("#tabs").innerHTML = tabs;
    $("#tabs").querySelectorAll("button").forEach(b => b.onclick = () => { cur = b.dataset.p; render(); });

    if(coord){
      const nb = document.getElementById("nightBar") || (() => { const d = document.createElement("div"); d.id = "nightBar"; d.className = "box nightbar"; $("#tabs").before(d); return d; })();
      const pubN = +((Object.values(remote).find(Boolean)||{}).night||0);
      nb.innerHTML = `<div class="nb-title">Ночь на карточках сейчас: <b>${["до игры","N1","N2","N3","N4"][pubN]}</b>${(+M.night||0)!==pubN?` → <b class="pend">${["до игры","N1","N2","N3","N4"][+M.night||0]}</b> после «Опубликовать»`:""}</div>
        <div class="seg">${["до игры","N1","N2","N3","N4"].map((t,i)=>`<button data-n="${i}" class="${(+M.night||0)===i?"on":""}">${t}</button>`).join("")}</div>`;
      nb.querySelectorAll("[data-n]").forEach(b => b.onclick = () => { M.night = +b.dataset.n; saveDraft(); render(); status("Ночь выбрана — нажми «Опубликовать».", "ok"); });
    }
    if(cur === "_ev") return renderEvents();
    if(cur === "_links") return renderLinks();
    if(cur === "_keys") return renderKeys();
    renderPlayer(PLAYERS.find(p => p.id === cur));
  }
  function renderTabsOnly(){
    $("#tabs").querySelectorAll("button[data-p]").forEach(b => {
      const p = PLAYERS.find(x=>x.id===b.dataset.p); if(!p) return;
      const cnt = Object.values(M.players[p.id].frag).filter(s=>s.on).length;
      b.querySelector("small").textContent = `${VOICE_NAMES[p.voice]} · ${cnt}/7${dirty(p)?" ●":""}`;
    });
  }

  /* --- карточка игрока (координатор) --- */
  function archSelect(kind, val){
    const names = LIB && LIB.archetypes ? Object.keys(LIB.archetypes[kind]) : [];
    if(val && !names.includes(val)) names.push(val);
    return `<select data-arch="${kind}"><option value="">— нет —</option>${names.map(n=>`<option ${n===val?"selected":""}>${esc(n)}</option>`).join("")}</select>`;
  }
  function itemRow(kind, f, s){
    const title = kind==="frag" ? `<span class="pill">${esc(f.night)}</span> <span class="pill ${f.kind==="гарантированный"?"g":""}">${esc(f.kind||"")}</span> <b>№${f.n}</b>` : `<b>${esc(f.label)}</b>`;
    return `<div class="item ${s.on?"on":""}" data-kind="${kind}" data-id="${esc(f.id)}">
      <label class="chk big"><input type="checkbox" data-f="on" ${s.on?"checked":""}> показать</label>
      <div><div class="ititle">${title}</div><div class="icard">${esc(kind==="frag" ? f.card : f.text)}</div>
        <div class="iopts">
          <label class="chk"><input type="checkbox" data-f="full" ${s.full?"checked":""}> полный текст</label>
          <input type="url" data-f="audio" placeholder="ссылка на аудио (mp3)" value="${esc(s.audio||"")}">
          ${f.text ? `<details><summary>текст</summary><div class="ftext">${esc(f.text)}</div></details>` : ""}
        </div></div></div>`;
  }
  function renderPlayer(p){
    const m = M.players[p.id], v = LIB && LIB.voices[p.voice];
    const frs = v ? v.fragments : Object.values(m.cache).filter(x=>x.n!==undefined);
    const outs = v ? v.outcomes : Object.values(m.cache).filter(x=>x.label!==undefined);
    const ensure = (map,id) => map[id] || (map[id] = { on:false, full:false, audio:"" });
    const base = location.href.replace(/[^/]*\/[^/]*$/,"");
    $("#main").innerHTML = `
      <div class="box"><div class="pagehead"><h2>${esc(p.title)} · ${esc(m.character||"")} · голос ${VOICE_NAMES[p.voice]}</h2><a class="btn ghost small" href="${base}${p.slug}/" target="_blank">Открыть карточку ↗</a></div></div>
      <div class="box"><h2>Осколки голоса</h2>${frs.length ? frs.map(f=>itemRow("frag", f, ensure(m.frag,f.id))).join("") : `<p class="muted">Библиотека не загружена: видны только опубликованные. Загрузи её во вкладке «Ключи».</p>`}</div>
      <div class="box"><h2>Карточки четвёртой ночи</h2>${outs.map(o=>itemRow("out", o, ensure(m.out,o.id))).join("") || `<p class="muted">—</p>`}</div>
      <details class="box"><summary style="cursor:pointer;font:400 19px Forum,serif">Профиль: имя, архетипы, напоминалка, объявление</summary>
        <div class="grid2">
          <label>Имя персонажа<input data-pf="character" value="${esc(m.character)}"></label>
          <label>Имя голоса<input data-pf="voiceName" value="${esc(m.voiceName)}"><span class="chk"><input type="checkbox" data-pf="showVoiceName" ${m.showVoiceName?"checked":""}> имя проступает у игрока</span></label>
          <label>Внешний архетип ${archSelect("external", m.external.name)}</label>
          <label>Внутренний архетип ${archSelect("internal", m.internal.name)}</label>
        </div>
        <label>Описание внешнего<textarea data-at="external" rows="2">${esc(m.external.text)}</textarea></label>
        <label>Описание внутреннего<textarea data-at="internal" rows="2">${esc(m.internal.text)}</textarea></label>
        <label>Напоминалка «Помни»<textarea data-pf="notes" rows="2">${esc(m.notes)}</textarea></label>
        <label>Объявление только для этого игрока<textarea data-pf="notice" rows="2">${esc(m.notice)}</textarea></label></details>
      <p class="muted">Видения и ивенты для игрока — во вкладке «Видения». Они сохраняются сразу, кнопка «Опубликовать» для них не нужна.</p>`;
    const main = $("#main");
    main.querySelectorAll("[data-pf]").forEach(i => i.oninput = i.onchange = () => { m[i.dataset.pf] = i.type==="checkbox" ? i.checked : i.value; saveDraft(); renderTabsOnly(); });
    main.querySelectorAll("[data-arch]").forEach(sel => sel.onchange = () => { const k = sel.dataset.arch; m[k] = { name:sel.value, text: LIB && LIB.archetypes[k][sel.value] || "" }; saveDraft(); render(); });
    main.querySelectorAll("[data-at]").forEach(t => t.oninput = () => { m[t.dataset.at].text = t.value; saveDraft(); renderTabsOnly(); });
    main.querySelectorAll(".item").forEach(row => {
      const s = ensure(row.dataset.kind==="frag" ? m.frag : m.out, row.dataset.id);
      row.querySelectorAll("[data-f]").forEach(i => i.oninput = i.onchange = () => {
        s[i.dataset.f] = i.type==="checkbox" ? i.checked : i.value;
        if(i.dataset.f!=="on" && i.type==="checkbox" && i.checked) s.on = true;
        if(i.dataset.f==="on" && i.checked && !s.audio) s.full = true;
        row.classList.toggle("on", s.on); row.querySelector('[data-f=on]').checked = s.on; row.querySelector('[data-f=full]').checked = s.full;
        saveDraft(); renderTabsOnly(); });
    });
  }

  /* --- видения --- */
  let editing = null;
  function renderEvents(){
    const list = allExtras();
    const x = editing || { id:"", title:"", text:"", night:"", audio:"", to:[] };
    $("#main").innerHTML = `
      <div class="box"><h2>${editing ? "Изменить видение" : "Вкинуть видение или ивент"}</h2>
        <div><span class="muted" style="font-size:13px">Кому</span><br>
          <label class="chk"><input type="checkbox" id="toAll"> всем</label>
          ${PLAYERS.map(p => `<label class="chk"><input type="checkbox" class="to" value="${p.id}" ${x.to.includes(p.id)?"checked":""}> ${esc(charName(p))}</label>`).join("")}</div>
        <label>Короткая фраза (видна сразу)<textarea id="e-title" rows="2">${esc(x.title)}</textarea></label>
        <label>Полный текст — необязательно<textarea id="e-text" rows="4">${esc(x.text)}</textarea></label>
        <div class="grid2">
          <label>Ночь<select id="e-night">${["","N1","N2","N3","N4"].map(n=>`<option value="${n}" ${x.night===n?"selected":""}>${n||"без ночи"}</option>`).join("")}</select></label>
          <label>Аудио — необязательно<input id="e-audio" type="url" value="${esc(x.audio)}" placeholder="https://…mp3"></label>
        </div>
        <label>Подпись (видят только мастера)<input id="e-by" value="${esc(x.by || S.name || "")}" placeholder="кто вкинул"></label>
        <p class="muted" style="font-size:13px">Разметка: <code>~~ложь~~{правда}</code> зачёркнуто и переписано · <code>[[скрытое]]</code> видно при выделении · <code>||имя||</code> чёрная плашка.</p>
        <button class="btn" id="e-save">${editing ? "Сохранить" : "Вкинуть"}</button>
        ${editing ? `<button class="btn ghost" id="e-cancel">Отмена</button>` : ""}
      </div>
      <div class="box"><h2>Уже вкинуто · ${list.length}</h2>
        ${list.map(e => `<div class="ev" data-id="${esc(e.id)}">
          <div>${e.night?`<span class="pill">${esc(e.night)}</span> `:""}<b>${esc(e.title)}</b></div>
          ${e.text?`<div class="muted" style="font-size:14px">${esc(e.text.slice(0,180))}${e.text.length>180?"…":""}</div>`:""}
          <div class="who">→ ${e.to.map(id => esc(charName(PLAYERS.find(p=>p.id===id)))).join(", ")}${e.by?` · ${esc(e.by)}`:""}${e.at?` · ${new Date(e.at).toLocaleString("ru-RU",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}`:""}</div>
          <div class="acts"><button class="btn ghost small" data-edit>Изменить</button><button class="btn ghost small" data-del>Убрать</button></div>
        </div>`).join("") || `<p class="muted">Пока ничего.</p>`}
      </div>`;
    const tos = [...document.querySelectorAll(".to")];
    $("#toAll").checked = tos.every(t => t.checked);
    $("#toAll").onchange = e => tos.forEach(t => t.checked = e.target.checked);
    tos.forEach(t => t.onchange = () => $("#toAll").checked = tos.every(t => t.checked));
    $("#e-by").onchange = e => { S.name = e.target.value.trim(); ls.set("malk-name", S.name); };
    if(editing) $("#e-cancel").onclick = () => { editing = null; renderEvents(); };
    $("#e-save").onclick = async () => {
      const to = tos.filter(t => t.checked).map(t => t.value);
      const item = { id: x.id || ("x" + Date.now().toString(36) + Math.random().toString(36).slice(2,5)),
        title: $("#e-title").value.trim(), text: $("#e-text").value.trim(), night: $("#e-night").value,
        audio: $("#e-audio").value.trim(), by: $("#e-by").value.trim(), at: x.at || new Date().toISOString() };
      if(!item.title && !item.text) return status("Нужна хотя бы короткая фраза.", "bad");
      if(!to.length && !editing) return status("Выбери, кому.", "bad");
      $("#e-save").disabled = true; status("Сохраняю…");
      try{ await saveExtra(item, to); editing = null; status(to.length ? "Готово. Игроки увидят через 1–2 минуты." : "Убрано.", "ok"); }
      catch(e){ status("Ошибка: " + e.message, "bad"); }
      renderEvents();
    };
    document.querySelectorAll(".ev").forEach(row => {
      const e = list.find(v => v.id === row.dataset.id);
      row.querySelector("[data-edit]").onclick = () => { editing = { ...e }; renderEvents(); scrollTo({ top:0, behavior:"smooth" }); };
      row.querySelector("[data-del]").onclick = async () => {
        if(!confirm("Убрать это видение у всех, кому оно вкинуто?")) return;
        status("Убираю…");
        try{ await saveExtra(e, []); status("Убрано.", "ok"); }catch(err){ status("Ошибка: " + err.message, "bad"); }
        renderEvents();
      };
    });
  }

  /* --- ссылки и общее --- */
  function renderLinks(){
    const base = location.href.replace(/[^/]*\/[^/]*$/,"");
    $("#main").innerHTML = `<div class="box"><h2>Ссылки внизу каждой карточки</h2>
      ${["masters","ilinka","chat"].map(k => { const L = M.links[k]||{}; return `<div class="row link" data-l="${k}">
        <label class="chk big"><input type="checkbox" data-lf="show" ${L.show?"checked":""}> показывать</label>
        <input data-lf="label" value="${esc(L.label)}" placeholder="подпись"><input data-lf="url" type="url" value="${esc(L.url)}" placeholder="https://t.me/..."></div>`; }).join("")}
      <h2 style="margin-top:16px">Объявление для всех</h2>
      <textarea id="gnotice" rows="3" placeholder="Сверху у всех пятерых. Пусто — не видно.">${esc(M.notice)}</textarea>
      <h2 style="margin-top:16px">Адреса</h2>
      <ul class="urls">${PLAYERS.map(p=>`<li><b>${esc(p.title)}</b> — <a href="${base}${p.slug}/" target="_blank">${base}${p.slug}/</a></li>`).join("")}
      <li><b>Пульт</b> — <a href="${location.href.split("?")[0]}">${location.href.split("?")[0]}</a></li></ul>
      <p class="muted" style="font-size:14px">Предпросмотр любой ночи: допиши к адресу карточки <code>?night=4</code>, после полуночи — <code>?night=4&late=1</code>.</p></div>`;
    $("#main").querySelectorAll("[data-lf]").forEach(i => i.oninput = i.onchange = () => {
      const k = i.closest("[data-l]").dataset.l; M.links[k] = M.links[k]||{}; M.links[k][i.dataset.lf] = i.type==="checkbox" ? i.checked : i.value; saveDraft(); renderTabsOnly(); });
    $("#gnotice").oninput = e => { M.notice = e.target.value; saveDraft(); renderTabsOnly(); };
  }

  /* --- ключи --- */
  function renderKeys(){
    $("#main").innerHTML = `<div class="box"><h2>Ключи и библиотека</h2>
      <p class="muted">Библиотека: ${LIB ? Object.values(LIB.voices).reduce((a,v)=>a+v.fragments.length,0) + " фрагментов" : "не загружена"}.</p>
      <p>Сменить пароли, токен или обновить library.json — через ту же форму, что и первичная настройка. Новый пароль мастеров сообщи мастерам.</p>
      <button class="btn" id="toSetup2">Перевыпустить ключи</button></div>`;
    $("#toSetup2").onclick = () => openSetup(true);
  }

  /* ================= вход и настройка ================= */
  const guessRepo = () => {
    const h = location.hostname.match(/^([^.]+)\.github\.io$/i);
    const seg = location.pathname.split("/").filter(Boolean);
    return { owner: h ? h[1] : "", repo: h && seg.length > 1 ? seg[0] : (h ? h[1] + ".github.io" : "") };
  };
  async function fetchVault(){
    try{ const r = await fetch(`../${VAULT}?t=${Date.now()}`, { cache:"no-store" }); return r.ok ? await r.json() : null; }catch(e){ return null; }
  }
  async function tryLogin(pw){
    const vault = await fetchVault();
    if(!vault) throw new Error("Ключи ещё не настроены — нажми «Первичная настройка ключей».");
    try{ const k = await deriveKey(pw, b64d(vault.salt_c)); const s = await unseal(k, vault.coord);
      const lib = vault.lib ? await unseal(k, vault.lib) : null; return { s:{ ...s, role:"coord" }, lib }; }catch(e){}
    try{ const k = await deriveKey(pw, b64d(vault.salt_m)); const s = await unseal(k, vault.master);
      return { s:{ ...s, role:"master" }, lib:null }; }catch(e){}
    throw new Error("Неверный пароль.");
  }
  let setupLib = null, fromApp = false;
  function openSetup(inApp){
    fromApp = !!inApp; show("setupView");
    const g = guessRepo();
    $("#s-owner").value = (S && S.owner) || g.owner; $("#s-repo").value = (S && S.repo) || g.repo;
    $("#s-branch").value = (S && S.branch) || "main"; $("#s-token").value = (S && S.role==="coord" && S.token) || "";
    setupLib = LIB; $("#s-libstate").textContent = LIB ? "(текущая загружена, можно заменить)" : "";
  }
  async function doSetup(){
    const st = (t,c) => { $("#setupStatus").textContent = t; $("#setupStatus").className = "status " + (c||""); };
    const cfg = { owner:$("#s-owner").value.trim(), repo:$("#s-repo").value.trim(), branch:$("#s-branch").value.trim()||"main", token:$("#s-token").value.trim() };
    const pc = $("#s-pc").value, pm = $("#s-pm").value;
    if(!cfg.owner || !cfg.repo || !cfg.token) return st("Заполни логин, репозиторий и токен.", "bad");
    if(pc.length < 8 || pm.length < 8) return st("Пароли — минимум 8 символов.", "bad");
    if(pc === pm) return st("Пароли координатора и мастеров должны различаться.", "bad");
    $("#setupBtn").disabled = true; st("Шифрую… (несколько секунд)");
    try{
      const salt_c = crypto.getRandomValues(new Uint8Array(16)), salt_m = crypto.getRandomValues(new Uint8Array(16));
      const kc = await deriveKey(pc, salt_c), km = await deriveKey(pm, salt_m);
      const vault = { v:1, iter:ITER, salt_c:b64e(salt_c), salt_m:b64e(salt_m),
        coord: await seal(kc, cfg), master: await seal(km, cfg), lib: setupLib ? await seal(kc, setupLib) : null };
      S = { ...cfg, role:"coord", name: ls.get("malk-name","") };
      st("Сохраняю в репозиторий…");
      const { sha } = await getFile(VAULT).catch(() => ({ sha:null }));
      const r = await putFile(VAULT, vault, sha, "Ключи пульта");
      if(r.conflict) throw new Error("конфликт версии, попробуй ещё раз");
      LIB = setupLib; ls.set("malk-lib", LIB);
      ls.set("malk-session", S);
      st("Готово. Сайт обновится через минуту — после этого вход по паролю работает на любом устройстве.", "ok");
      setTimeout(startApp, 1200);
    }catch(e){ st("Ошибка: " + e.message, "bad"); }
    $("#setupBtn").disabled = false;
  }

  async function startApp(){
    show("appView");
    try{ await loadRemote(); }catch(e){ status(e.message, "bad"); }
    if(S.role === "coord"){
      const draft = ls.get("malk-draft", null);
      M = (draft && draft.players && PLAYERS.every(p => draft.players[p.id])) ? draft : modelFromRemote();
      if(M === draft && PLAYERS.some(dirty)) status("Есть неопубликованный черновик с этого устройства (●).", "ok");
    }
    render();
  }

  function init(){
    $("#toSetup").onclick = e => { e.preventDefault(); openSetup(false); };
    $("#setupCancel").onclick = () => fromApp ? (show("appView"), render()) : show("loginView");
    $("#s-lib").onchange = async e => { const f = e.target.files[0]; if(!f) return;
      try{ setupLib = JSON.parse(await f.text()); $("#s-libstate").textContent = "(новая выбрана)"; }catch(err){ $("#s-libstate").textContent = "(это не library.json)"; } };
    $("#setupBtn").onclick = doSetup;
    const go = async () => {
      $("#loginBtn").disabled = true; $("#loginStatus").textContent = "Проверяю…"; $("#loginStatus").className = "status";
      try{
        const { s, lib } = await tryLogin($("#pw").value);
        S = { ...s, name: ls.get("malk-name","") }; LIB = lib;
        if($("#remember").checked){ ls.set("malk-session", S); if(lib) ls.set("malk-lib", lib); }
        else { ss.set("malk-session", S); if(lib) ss.set("malk-lib", lib); }
        $("#pw").value = ""; startApp();
      }catch(e){ $("#loginStatus").textContent = e.message; $("#loginStatus").className = "status bad"; }
      $("#loginBtn").disabled = false;
    };
    $("#loginBtn").onclick = go;
    $("#pw").onkeydown = e => { if(e.key === "Enter") go(); };
    $("#logout").onclick = () => { ["malk-session","malk-lib","malk-draft"].forEach(k => { ls.del(k); ss.del(k); }); location.reload(); };
    $("#publish").onclick = publish;
    $("#night").onchange = e => { M.night = +e.target.value; saveDraft(); render(); status("Ночь выбрана — нажми «Опубликовать».", "ok"); };

    S = ls.get("malk-session", null) || ss.get("malk-session");
    if(S){ LIB = ls.get("malk-lib", null) || ss.get("malk-lib"); S.name = ls.get("malk-name", S.name||""); startApp(); }
    else show("loginView");
  }
  init();
})();
