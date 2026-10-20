/* HydroGuard — Nurse Unit Manager dashboard (manager.html)
   Demo interactions persist in localStorage under hg-mgr-* (urine test requests).
   Reads hg-acks (written by the ward page) so acknowledged alerts show up here too. */
(function (HG) {
  const $ = HG.$;
  const R = HG.RESIDENTS;
  const LT = HG.LATEST_TIME;
  const NOW = new Date();
  const ME = HG.STAFF.leanne;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const LEVEL_ORDER = ['high', 'watch', 'low'];
  const UNIT = { temp: '°C', hr: 'bpm', hyd: '%' };
  const LOWER = { temp: 'temperature', hr: 'heart rate', hyd: 'hydration' };

  // ---------- Storage (fails quietly) ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } },
  };

  // ---------- Helpers ----------
  const pad2 = n => String(n).padStart(2, '0');
  const fmtDMY = d => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  const fmtDM = d => `${d.getDate()}/${d.getMonth() + 1}`;
  const first = r => r.preferred || r.name.split(' ')[0];
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
  const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const median = arr => { const a = [...arr].sort((x, y) => x - y); const m = a.length >> 1; return a.length ? (a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2) : 0; };
  const zoneText = (loc, r) => loc === 'room' ? `room ${r.room}` : HG.ZONES[loc].label.toLowerCase();
  const ago = d => { const s = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000)); return s < 60 ? (s < 5 ? 'just now' : `${s} sec ago`) : HG.fmtAgo(d); };

  // ---------- Header: "Locations" is current when the hash is #map ----------
  const header = HG.mountHeader({
    context: HG.FACILITY.name,
    tabs: [
      { href: 'nurse.html', label: 'Ward', icon: 'people' },
      { href: 'manager.html#map', label: 'Locations', icon: 'map', current: location.hash === '#map' },
      { href: 'manager.html', label: 'Manager', icon: 'chart', current: location.hash !== '#map' },
      { href: 'index.html', label: 'Demo', icon: 'home' },
    ],
  });
  function syncTabs() {
    const links = header.querySelectorAll('.hg-tabs a');
    const onMap = location.hash === '#map';
    links.forEach(a => a.removeAttribute('aria-current'));
    if (links[onMap ? 1 : 2]) links[onMap ? 1 : 2].setAttribute('aria-current', 'page');
  }
  window.addEventListener('hashchange', syncTabs);

  $('#shift-text').textContent = HG.SHIFT || '';
  $('#who').textContent = `${ME.name}, ${ME.role}. ${HG.fmtDay(NOW)}, ${HG.fmtTime(NOW)}`;

  // ---------- Made-up device data ----------
  const BATTERY = { margaret: 72, ravi: 64, elsie: 81, bill: 55, wei: 90, dorothy: 47, joan: 68, kev: 18 };
  const counts = rs => LEVEL_ORDER.reduce((o, l) => (o[l] = rs.filter(r => r.risk.level === l).length, o), {});

  // =====================================================================
  // 1. Home overview
  // =====================================================================
  function renderOverview() {
    const c = counts(R);
    $('#ov-time').textContent = `Readings at ${HG.fmtTime(LT)}`;
    $('#ov-block').innerHTML = `
      <div class="ov-nums">
        <div class="ov-num"><span class="reading">${R.length}</span><span class="small">residents</span></div>
        ${LEVEL_ORDER.map(l => `<div class="ov-num"><span class="reading">${c[l]}</span>${HG.riskChip(l)}</div>`).join('')}
      </div>`;

    const wingRows = HG.FACILITY.wings.map(w => {
      const rs = R.filter(r => r.wing === w);
      const wc = counts(rs);
      const text = LEVEL_ORDER.map(l => `${wc[l]} ${HG.LEVELS[l].label.toLowerCase()}`).join(', ');
      const segs = LEVEL_ORDER.filter(l => wc[l]).map(l =>
        `<span class="seg-${l}" style="flex:${wc[l]}">${wc[l]}</span>`).join('');
      return `
        <div class="wing-row">
          <div class="row-between"><h3>${w} wing</h3><span class="small muted">${plural(rs.length, 'resident')}</span></div>
          <div class="stack-bar" role="img" aria-label="${w} wing: ${text}">${segs}</div>
          <p class="xs muted">${text.charAt(0).toUpperCase() + text.slice(1)}</p>
        </div>`;
    }).join('');

    const lowBat = R.filter(r => BATTERY[r.id] < 25);
    const next = new Date(LT.getTime() + 2 * 3600e3);
    $('#ov-rows').innerHTML = `
      ${wingRows}
      <div>
        <div class="callout">
          <span class="label">Wristbands reported at ${HG.fmtTime(LT)}</span><span class="line low"></span>
          <span class="reading ov-val">${R.length}<span class="unit">of ${R.length}</span></span>
        </div>
        <p class="xs muted">Next readings due at ${HG.fmtTime(next)}.</p>
      </div>
      <div>
        <div class="callout">
          <span class="label">Wristbands needing a charge</span><span class="line ${lowBat.length ? 'watch' : 'low'}"></span>
          <span class="reading ov-val">${lowBat.length}</span>
        </div>
        ${lowBat.map(r => `<p class="xs muted">${HG.esc(first(r))}’s wristband (room ${r.room}) is at ${BATTERY[r.id]}%. Swap it before the ${HG.fmtTime(next)} reading.</p>`).join('')}
      </div>`;
  }

  // =====================================================================
  // 2. Live location map
  // =====================================================================
  // Plan areas in % of the plan. Zone dots use HG.ZONES / HG.ROOM_POS coordinates.
  const AREAS = [
    { id: 'activities', label: 'Activities', x: 6, y: 4, w: 31, h: 29 },
    { id: 'lounge', label: 'Lounge', x: 38, y: 4, w: 24, h: 29 },
    { id: 'dining', label: 'Dining', x: 63, y: 4, w: 32, h: 29 },
    { id: 'garden', label: 'Courtyard garden', x: 33, y: 40, w: 34, h: 25, cls: 'garden' },
    { id: 'physio', label: 'Physio', x: 15, y: 71, w: 15, h: 24 },
    { id: 'station', label: 'Nurses’ station', x: 34, y: 71, w: 22, h: 16, cls: 'station' },
  ];
  const ROOM_W = { Banksia: { w: 12, h: 12 }, Waratah: { w: 8, h: 18 } };

  const live = {};
  R.forEach((r, i) => { live[r.id] = { loc: r.location, seen: new Date(NOW.getTime() - [2, 4, 1, 3, 6, 2, 5, 1][i % 8] * 60e3) }; });
  let lastUpdate = Date.now() - 5000;
  let paused = false;
  let openId = null;
  const doorFeed = [];

  function drawPlan() {
    const host = $('#plan-svg');
    const W = Math.max(300, host.clientWidth || 340);
    const H = Math.round(W * (W < 600 ? 0.9 : 0.62));
    host.parentNode.style.height = H + 'px';
    const X = v => (v / 100) * W, Y = v => (v / 100) * H;
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
    s += `<rect class="pl-floor" x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12"/>`;
    AREAS.forEach(a => {
      s += `<rect class="pl-area ${a.cls || ''}" x="${X(a.x)}" y="${Y(a.y)}" width="${X(a.w)}" height="${Y(a.h)}" rx="6"/>`;
      s += `<text class="pl-label" x="${X(a.x) + 7}" y="${Y(a.y) + 15}">${a.label}</text>`;
    });
    Object.entries(HG.ROOM_POS).forEach(([room, p]) => {
      const wing = R.find(r => r.room === room)?.wing || (p.x < 50 ? 'Banksia' : 'Waratah');
      const d = ROOM_W[wing];
      s += `<rect class="pl-room ${wing.toLowerCase()}" x="${X(p.x - d.w / 2)}" y="${Y(p.y - d.h / 2)}" width="${X(d.w)}" height="${Y(d.h)}" rx="4"/>`;
      s += `<text class="pl-num" x="${X(p.x - d.w / 2) + 4}" y="${Y(p.y - d.h / 2) + 11}">${room}</text>`;
    });
    s += `<text class="pl-wing" x="${X(15.5)}" y="${Y(39)}">Banksia wing</text>`;
    s += `<text class="pl-wing" x="${X(95)}" y="${Y(66)}" text-anchor="end">Waratah wing</text>`;
    s += '</svg>';
    host.innerHTML = s;
  }

  function posOf(r) {
    const loc = live[r.id].loc;
    return loc === 'room' || !HG.ZONES[loc] || HG.ZONES[loc].x == null ? HG.ROOM_POS[r.room] : HG.ZONES[loc];
  }
  function groupKey(r) { const loc = live[r.id].loc; return loc === 'room' || loc === 'bathroom' ? 'room-' + r.room : loc; }

  function layoutDots() {
    const host = $('#plan-dots');
    const spacing = host.clientWidth < 600 ? 30 : 46;
    const groups = {};
    R.forEach(r => (groups[groupKey(r)] = groups[groupKey(r)] || []).push(r));
    Object.values(groups).forEach(list => {
      const n = list.length, cols = Math.min(n, 3), rows = Math.ceil(n / cols);
      list.forEach((r, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const dx = (col - (cols - 1) / 2) * spacing, dy = (row - (rows - 1) / 2) * spacing + 6;
        const p = posOf(r);
        let el = host.querySelector(`[data-id="${r.id}"]`);
        if (!el) {
          el = HG.h(`<button type="button" class="m-dot" data-id="${r.id}">${HG.avatar(r)}<span class="m-name">${HG.esc(first(r))}</span></button>`);
          el.addEventListener('click', e => { e.stopPropagation(); openId === r.id ? closePop() : openPop(r.id); });
          host.appendChild(el);
        }
        el.style.left = p.x + '%';
        el.style.top = p.y + '%';
        el.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        el.dataset.dx = dx; el.dataset.dy = dy;
        el.setAttribute('aria-label', `${first(r)}, ${HG.LEVELS[r.risk.level].label.toLowerCase()}, in ${zoneText(live[r.id].loc, r)}. Show details`);
        el.setAttribute('aria-expanded', openId === r.id ? 'true' : 'false');
      });
    });
    if (openId) placePop();
  }

  function openPop(id) {
    const r = HG.resident(id);
    openId = id;
    const pop = $('#pop');
    const st = live[id];
    const nurse = HG.staff(r.nurse);
    pop.innerHTML = `
      <div class="row pop-top">
        ${HG.avatar(r)}
        <div class="pop-who">
          <h3 id="pop-name" tabindex="-1">${HG.esc(r.name)}</h3>
          <p class="xs muted">Room ${r.room}, ${r.wing} wing</p>
        </div>
        <button type="button" class="icon-btn pop-close" aria-label="Close details">${HG.icon.close}</button>
      </div>
      <div class="ruled pop-rows small">
        <div class="row-between"><span class="muted">Risk</span>${HG.riskChip(r.risk.level)}</div>
        <div class="row-between"><span class="muted">Now in</span><span>${HG.esc(zoneText(st.loc, r).replace(/^./, c => c.toUpperCase()))}</span></div>
        <div class="row-between"><span class="muted">Last seen</span><span data-seen>${ago(st.seen)}</span></div>
        <div class="row-between"><span class="muted">Nurse</span><span>${HG.esc(nurse ? `${nurse.name.split(' ')[0]} (${nurse.short})` : 'Not set')}</span></div>
      </div>
      <div class="row pop-links">
        <a class="btn" href="resident.html?id=${r.id}">Open profile</a>
        <a class="btn secondary" href="report.html?id=${r.id}">Health report</a>
      </div>`;
    pop.hidden = false;
    pop.querySelector('.pop-close').addEventListener('click', () => closePop(true));
    HG.$$('.m-dot').forEach(d => d.setAttribute('aria-expanded', d.dataset.id === id ? 'true' : 'false'));
    placePop();
    pop.querySelector('#pop-name').focus({ preventScroll: true });
  }
  function closePop(returnFocus) {
    if (!openId) return;
    const id = openId;
    openId = null;
    $('#pop').hidden = true;
    HG.$$('.m-dot').forEach(d => d.setAttribute('aria-expanded', 'false'));
    if (returnFocus) { const d = $(`.m-dot[data-id="${id}"]`); d && d.focus(); }
  }
  function placePop() {
    const pop = $('#pop'), plan = $('#plan');
    const dot = $(`.m-dot[data-id="${openId}"]`);
    if (!dot) return;
    const W = plan.clientWidth, H = plan.clientHeight;
    const p = posOf(HG.resident(openId));
    const cx = (p.x / 100) * W + Number(dot.dataset.dx), cy = (p.y / 100) * H + Number(dot.dataset.dy);
    const pw = Math.min(264, W - 8);
    pop.style.width = pw + 'px';
    pop.style.left = Math.max(4, Math.min(W - pw - 4, cx - pw / 2)) + 'px';
    const ph = pop.offsetHeight;
    pop.style.top = (cy > H * 0.62 ? cy - 26 - ph : cy + 26) + 'px';
  }
  document.addEventListener('click', e => { if (openId && !e.target.closest('#pop')) closePop(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && openId) closePop(true); });

  const LIST_ORDER = ['lounge', 'dining', 'activities', 'garden', 'physio', 'bathroom', 'room'];
  function renderLocList() {
    $('#loc-list').innerHTML = LIST_ORDER.map(z => {
      const rs = R.filter(r => live[r.id].loc === z);
      if (!rs.length && (z === 'bathroom')) return '';
      const people = rs.length
        ? rs.map(r => `<a class="loc-person" href="resident.html?id=${r.id}">${HG.esc(first(r))}${z === 'room' ? ` (room ${r.room})` : ''}</a> ${HG.riskChip(r.risk.level)}`).join('')
        : '<span class="faint">Nobody here</span>';
      return `<div class="loc-row"><span class="loc-zone">${HG.ZONES[z].label}</span><span class="loc-people">${people}</span></div>`;
    }).join('');
  }

  // Door access: unlocks from each resident's events, plus a made-up refused attempt
  R.forEach(r => r.events.filter(e => /door unlocked/i.test(e.text)).forEach(e =>
    doorFeed.push({ time: e.time, r, text: `Room ${r.room} door unlocked`, ok: true })));
  doorFeed.push({ time: new Date(LT.getTime() - 25 * 60e3), r: HG.resident('bill'), text: 'Tried room 3 door. Not his room, so it stayed locked', ok: false });
  function renderDoorFeed() {
    doorFeed.sort((a, b) => b.time - a.time);
    $('#door-feed').innerHTML = doorFeed.slice(0, 8).map(d => `
      <div class="door-row">
        ${HG.avatar(d.r)}
        <div class="door-text"><span><strong>${HG.esc(first(d.r))}</strong> ${HG.esc(d.text)}</span>
          <span class="xs muted">${HG.fmtTime(d.time)}</span></div>
        <span class="chip ${d.ok ? 'plain' : 'high'}">${d.ok ? 'Unlocked' : 'Refused'}</span>
      </div>`).join('');
  }

  // "Appear live": every 8 seconds one low-risk resident moves somewhere else
  const MOVERS = R.filter(r => r.risk.level === 'low');
  const DESTS = ['lounge', 'dining', 'garden', 'activities', 'physio', 'room'];
  function moveOne() {
    const r = MOVERS[Math.floor(Math.random() * MOVERS.length)];
    const options = DESTS.filter(z => z !== live[r.id].loc);
    const to = options[Math.floor(Math.random() * options.length)];
    live[r.id] = { loc: to, seen: new Date() };
    if (to === 'room') doorFeed.push({ time: new Date(), r, text: `Room ${r.room} door unlocked`, ok: true });
    lastUpdate = Date.now();
    layoutDots();
    renderLocList();
    renderDoorFeed();
    if (openId === r.id) openPop(r.id);
  }
  setInterval(() => { if (!paused && !document.hidden) moveOne(); }, 8000);
  setInterval(() => {
    $('#live-ago').textContent = paused ? 'paused' : `updated ${ago(new Date(lastUpdate))}`;
    const seen = $('#pop [data-seen]');
    if (seen && openId) seen.textContent = ago(live[openId].seen);
  }, 1000);
  $('#live-toggle').addEventListener('click', e => {
    paused = !paused;
    e.currentTarget.textContent = paused ? 'Resume' : 'Pause';
    e.currentTarget.setAttribute('aria-pressed', String(paused));
    $('#live').classList.toggle('is-paused', paused);
    $('#live-ago').textContent = paused ? 'paused' : `updated ${ago(new Date(lastUpdate))}`;
  });
  const syncMotion = () => $('#plan').classList.toggle('no-motion', reduceMotion.matches);
  reduceMotion.addEventListener?.('change', syncMotion);

  // =====================================================================
  // 3. Alert response
  // =====================================================================
  const acks = store.get('hg-acks', {});
  function reasonFor(reading) {
    const sc = HG.scoreReading(reading);
    const parts = ['temp', 'hr', 'hyd'].filter(k => sc.parts[k] > 0)
      .map(k => `${LOWER[k]} ${HG.fmtValue(k, reading[k])}${k === 'hyd' ? '%' : ' ' + UNIT[k]}`);
    const s = parts.join(', ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function buildAlerts() {
    const out = [];
    const since = LT.getTime() - 11 * 3600e3;
    R.forEach(r => {
      r.readings.forEach((rd, i) => {
        if (i === 0 || rd.time.getTime() < since) return;
        const lvl = HG.scoreReading(rd).level, prev = HG.scoreReading(r.readings[i - 1]).level;
        const rose = HG.LEVELS[lvl].rank < HG.LEVELS[prev].rank;
        const still = i === 11 && lvl === 'high' && prev === 'high';
        if (!rose && !still) return;
        // who acknowledged, and how fast (deterministic, made up)
        let by, mins;
        if (r.wing === 'Waratah') by = HG.STAFF.tom.name;
        else by = lvl === 'high' ? HG.STAFF.priya.name : HG.STAFF.grace.name;
        mins = 3 + (hash(r.id + i) % 11);
        let ackTime = new Date(rd.time.getTime() + mins * 60e3);
        let open = false;
        if (i === 11 && lvl === 'high') {
          if (acks[r.id]) { by = acks[r.id].by; ackTime = new Date(acks[r.id].time); mins = Math.max(1, Math.round((ackTime - rd.time) / 60e3)); }
          else open = true;
        }
        if (ackTime > Date.now()) open = true;
        out.push({ time: rd.time, r, level: lvl, reason: (still ? 'Still high. ' : '') + reasonFor(rd), by, mins, open });
      });
    });
    return out.sort((a, b) => b.time - a.time || HG.LEVELS[a.level].rank - HG.LEVELS[b.level].rank);
  }
  const ALERTS = buildAlerts();

  function renderAlerts() {
    const done = ALERTS.filter(a => !a.open);
    const med = median(done.map(a => a.mins));
    const within = done.filter(a => a.mins <= 10).length;
    const openN = ALERTS.length - done.length;
    $('#al-stats').innerHTML = `
      <div class="callout"><span class="label">Median time to acknowledge</span><span class="line ${med <= 10 ? 'low' : 'watch'}"></span>
        <span class="reading al-val">${Math.round(med)}<span class="unit">min</span></span></div>
      <p class="xs muted">${within} of ${done.length} acknowledged within 10 minutes.${openN ? ` ${plural(openN, 'alert')} still open.` : ''}</p>`;
    $('#al-table').innerHTML = `
      <thead><tr><th scope="col">Time</th><th scope="col">Resident</th><th scope="col" class="al-level">Level</th><th scope="col">Acknowledged</th></tr></thead>
      <tbody>${ALERTS.map(a => `
        <tr>
          <td class="al-time">${HG.fmtTime(a.time)}</td>
          <td><a href="resident.html?id=${a.r.id}">${HG.esc(first(a.r))}</a> <span class="faint xs">room ${a.r.room}</span>
            <span class="al-chip-inline">${HG.riskChip(a.level)}</span>
            <div class="xs muted">${HG.esc(a.reason)}</div></td>
          <td class="al-level">${HG.riskChip(a.level)}</td>
          <td>${a.open
            ? `<span class="chip high plain">Open</span> <a class="xs" href="nurse.html">Go to ward</a>`
            : `${HG.esc(a.by.split(' ')[0])} <span class="muted">in ${a.mins} min</span>`}</td>
        </tr>`).join('')}</tbody>`;
  }

  // 14 days of alerts by level (made up, today's bar comes from the table above)
  const DAYS = (() => {
    const watch = [3, 2, 4, 3, 2, 3, 5, 3, 4, 4, 5, 6, 6];
    const high = [0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 2, 2];
    const days = watch.map((w, i) => ({ date: new Date(LT.getTime() - (13 - i) * 86400e3), watch: w, high: high[i] }));
    days.push({ date: LT, watch: ALERTS.filter(a => a.level === 'watch').length, high: ALERTS.filter(a => a.level === 'high').length, today: true });
    return days;
  })();
  function renderAlertChart() {
    const el = $('#al-chart');
    const W = Math.max(280, el.clientWidth || 320), H = 150;
    const pad = { t: 10, r: 4, b: 20, l: 22 };
    const max = Math.max(...DAYS.map(d => d.watch + d.high));
    const top = Math.ceil(max / 2) * 2 + 2;
    const bw = (W - pad.l - pad.r) / DAYS.length;
    const y = v => pad.t + (1 - v / top) * (H - pad.t - pad.b);
    let s = `<svg class="bar-chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Alerts per day over the last 14 days. Today: ${DAYS[13].high} high risk and ${DAYS[13].watch} watch.">`;
    [0, top / 2, top].forEach(t => { s += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${pad.l - 6}" y="${y(t) + 3}" text-anchor="end">${t}</text>`; });
    DAYS.forEach((d, i) => {
      const x = pad.l + i * bw + bw * 0.18, w = bw * 0.64;
      const label = `${fmtDMY(d.date)}: ${d.high} high risk, ${d.watch} watch`;
      s += `<g><title>${label}</title>`;
      s += `<rect class="b-watch" x="${x}" y="${y(d.watch)}" width="${w}" height="${y(0) - y(d.watch)}"/>`;
      s += `<rect class="b-high" x="${x}" y="${y(d.watch + d.high)}" width="${w}" height="${y(d.watch) - y(d.watch + d.high)}"/>`;
      s += '</g>';
      if (i % 3 === 1 || d.today) s += `<text class="axis${d.today ? ' today' : ''}" x="${x + w / 2}" y="${H - 5}" text-anchor="middle">${d.today ? 'Today' : fmtDM(d.date)}</text>`;
    });
    s += '</svg>';
    el.innerHTML = s;
  }

  // =====================================================================
  // 4. UTI watch
  // =====================================================================
  const UTI_KEY = 'hg-mgr-urine-tests';
  const urineTests = store.get(UTI_KEY, {});
  function utiSignals(r) {
    const rd = r.readings, n = r.nightBathroom;
    const t0 = rd[0].temp, t1 = rd[11].temp, h0 = rd[0].hyd, h1 = rd[11].hyd;
    const nA = (n[0] + n[1] + n[2]) / 3, nB = (n[4] + n[5] + n[6]) / 3;
    const sig = { temp: t1 >= 37.5 && t1 - t0 >= 0.5, hyd: h0 - h1 >= 8, night: nB - nA >= 1 };
    let status = null;
    if (sig.temp && sig.hyd && sig.night && r.risk.level === 'high') status = 'strong';
    else if (sig.temp && (sig.hyd || sig.night)) status = 'possible';
    return { sig, status, t0, t1, h0, h1 };
  }
  function spark(values, opts = {}) {
    const W = 100, H = 30, p = 3;
    const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
    const x = i => p + (i / (values.length - 1)) * (W - 2 * p);
    const y = v => p + (1 - (v - lo) / span) * (H - 2 * p);
    const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const last = values.length - 1;
    const body = opts.bars
      ? values.map((v, i) => { const bw = (W - 2 * p) / values.length * 0.6; const bx = p + i * (W - 2 * p) / values.length + bw * 0.33; const by = p + (1 - v / hi) * (H - 2 * p); return `<rect class="sp-bar${i === last ? ' last' : ''}" x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${(H - p - by).toFixed(1)}" rx="1"/>`; }).join('')
      : `<polyline class="sp-line" points="${pts}"/><circle class="sp-dot ${opts.cls || ''}" cx="${x(last)}" cy="${y(values[last])}" r="2.6"/>`;
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;
  }
  function renderUti() {
    const list = R.map(r => ({ r, u: utiSignals(r) })).filter(x => x.u.status)
      .sort((a, b) => (a.u.status === 'strong' ? 0 : 1) - (b.u.status === 'strong' ? 0 : 1));
    const notListed = R.filter(r => !utiSignals(r).status && r.risk.level === 'high');
    $('#uti-list').innerHTML = list.map(({ r, u }) => {
      const n = r.nightBathroom;
      const req = urineTests[r.id];
      const signs = [u.sig.temp && 'temperature up', u.sig.hyd && 'hydration down', u.sig.night && 'more night bathroom visits'].filter(Boolean);
      const signText = signs.join(', ').replace(/^./, c => c.toUpperCase()).replace(/, ([^,]*)$/, ' and $1');
      return `
        <div class="uti-row" data-id="${r.id}">
          <div class="row uti-top">
            ${HG.avatar(r)}
            <div class="uti-who"><a href="resident.html?id=${r.id}"><strong>${HG.esc(r.name)}</strong></a>
              <span class="xs muted">Room ${r.room}, ${r.wing} wing</span></div>
            <span class="chip ${u.status === 'strong' ? 'high' : 'watch'}">${u.status === 'strong' ? 'Strong signs' : 'Possible'}</span>
          </div>
          <p class="small">${signText}.${r.allergies.length ? ` <span class="muted">Allergies: ${HG.esc(r.allergies.join(', '))}.</span>` : ''}</p>
          <div class="sparks">
            <div class="sp"><span class="xs muted">Temperature, 24 hr</span>${spark(r.readings.map(x => x.temp), { cls: u.sig.temp ? 'up' : '' })}
              <span class="sp-val">${u.t1.toFixed(1)}<span class="unit">°C</span></span><span class="xs faint">from ${u.t0.toFixed(1)}</span></div>
            <div class="sp"><span class="xs muted">Hydration, 24 hr</span>${spark(r.readings.map(x => x.hyd), { cls: u.sig.hyd ? 'up' : '' })}
              <span class="sp-val">${u.h1}<span class="unit">%</span></span><span class="xs faint">from ${u.h0}</span></div>
            <div class="sp"><span class="xs muted">Night visits, 7 nights</span>${spark(n, { bars: true })}
              <span class="sp-val">${n[6]}<span class="unit">last night</span></span><span class="xs faint">from ${n[0]}</span></div>
          </div>
          <div class="row uti-action">
            ${req
              ? `<span class="chip low">Urine test requested</span><span class="xs muted">${HG.fmtTime(new Date(req.time))} by ${HG.esc(req.by.split(' ')[0])}</span>
                 <button type="button" class="btn ghost" data-cancel="${r.id}">Cancel request</button>`
              : `<button type="button" class="btn" data-urine="${r.id}">Recommend urine test</button>
                 <a class="btn ghost" href="report.html?id=${r.id}">Health report</a>`}
          </div>
        </div>`;
    }).join('') + (notListed.length ? `<p class="xs muted uti-note">${notListed.map(r => `${HG.esc(first(r))} is high risk from low hydration, but ${r.sex === 'F' ? 'her' : 'his'} temperature is steady, so ${r.sex === 'F' ? 'she is' : 'he is'} not on UTI watch.`).join(' ')}</p>` : '');
  }
  $('#uti-list').addEventListener('click', e => {
    const b = e.target.closest('[data-urine], [data-cancel]');
    if (!b) return;
    const id = b.dataset.urine || b.dataset.cancel;
    const r = HG.resident(id);
    if (b.dataset.urine) {
      urineTests[id] = { time: new Date().toISOString(), by: ME.name };
      HG.toast(`Urine test requested for ${first(r)}`);
    } else {
      delete urineTests[id];
      HG.toast(`Urine test request cancelled for ${first(r)}`);
    }
    store.set(UTI_KEY, urineTests);
    renderUti();
    const next = $(`.uti-row[data-id="${id}"] .uti-action button`);
    next && next.focus();
  });

  // =====================================================================
  // 5. Staffing
  // =====================================================================
  function renderStaff() {
    $('#staff-list').innerHTML = Object.values(HG.STAFF).map(s => {
      const n = R.filter(r => r.nurse === s.id).length;
      const isMe = s.id === ME.id;
      const load = n ? plural(n, 'resident') : (s.short === 'AIN' ? `Supports ${s.wing}` : 'Whole home');
      return `
        <div class="staff-row">
          ${HG.avatar(s)}
          <div class="staff-who"><strong>${HG.esc(s.name)}</strong> ${isMe ? '<span class="chip me plain">You</span>' : ''}
            <span class="xs muted">${HG.esc(s.role)} (${s.short}), ${HG.esc(s.wing === 'All wings' ? 'all wings' : s.wing + ' wing')}</span></div>
          <span class="staff-load small">${load}</span>
          ${isMe ? '<span class="staff-btn"></span>' : `<button type="button" class="btn secondary staff-btn" data-msg="${s.id}">Message</button>`}
        </div>`;
    }).join('');
  }
  $('#staff-list').addEventListener('click', e => {
    const b = e.target.closest('[data-msg]');
    if (b) HG.toast(`Message sent to ${HG.staff(b.dataset.msg).name.split(' ')[0]}`);
  });

  // =====================================================================
  // 6. Reports (CSV built from the data)
  // =====================================================================
  const csvCell = v => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  function downloadCsv(name, rows) {
    const csv = '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.hidden = true;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    HG.toast('CSV downloaded');
  }
  const stamp = `${LT.getFullYear()}-${pad2(LT.getMonth() + 1)}-${pad2(LT.getDate())}`;
  const REPORTS = [
    {
      id: 'daily', title: 'Daily ward summary', text: 'Every resident’s latest reading, risk and location.',
      rows: () => [['Resident', 'Preferred name', 'Room', 'Wing', 'Nurse', 'Risk', 'Score (of 9)', 'Temperature (°C)', 'Heart rate (bpm)', 'Hydration (%)', 'Reading time', 'Fluids today (mL)', 'Fluid target (mL)', 'Location', 'Resuscitation']]
        .concat(R.map(r => { const rd = r.readings[11]; return [r.name, r.preferred, r.room, r.wing, HG.staff(r.nurse).name, HG.LEVELS[r.risk.level].label, r.risk.total, rd.temp.toFixed(1), rd.hr, rd.hyd, `${fmtDMY(rd.time)} ${HG.fmtTime(rd.time)}`, r.fluids[6], r.fluidTarget, HG.ZONES[live[r.id].loc].label, r.resus.status]; })),
    },
    {
      id: 'fluids', title: 'Hydration and fluids (7 days)', text: 'Daily fluid intake against target, with average hydration index.',
      rows: () => {
        const out = [['Date', 'Resident', 'Room', 'Wing', 'Fluids (mL)', 'Target (mL)', 'Of target (%)', 'Average hydration index (%)']];
        R.forEach(r => r.fluids.forEach((ml, i) => {
          const day = new Date(LT.getTime() - (6 - i) * 86400e3);
          out.push([fmtDMY(day), r.name, r.room, r.wing, ml, r.fluidTarget, Math.round(ml / r.fluidTarget * 100), r.history[23 + i].hyd]);
        }));
        return out;
      },
    },
    {
      id: 'alerts', title: 'Alerts and response times', text: 'Alerts in the last 12 hours, who acknowledged them and how fast.',
      rows: () => [['Date', 'Time', 'Resident', 'Room', 'Wing', 'Level', 'Reason', 'Acknowledged by', 'Minutes to acknowledge']]
        .concat(ALERTS.map(a => [fmtDMY(a.time), HG.fmtTime(a.time), a.r.name, a.r.room, a.r.wing, HG.LEVELS[a.level].label, a.reason, a.open ? 'Not yet' : a.by, a.open ? '' : a.mins])),
    },
    {
      id: 'doors', title: 'Door access log', text: 'Wristband door unlocks and refused attempts.',
      rows: () => [['Date', 'Time', 'Resident', 'Room', 'Event', 'Result']]
        .concat([...doorFeed].sort((a, b) => b.time - a.time).map(d => [fmtDMY(d.time), HG.fmtTime(d.time), d.r.name, d.r.room, d.text, d.ok ? 'Unlocked' : 'Refused'])),
    },
  ];
  function renderReports() {
    $('#report-list').innerHTML = REPORTS.map(rp => `
      <div class="report-row">
        <div><strong>${rp.title}</strong><span class="xs muted">${rp.text}</span></div>
        <button type="button" class="btn secondary" data-csv="${rp.id}">${HG.icon.doc}Download CSV</button>
      </div>`).join('') + `
      <div class="report-row">
        <div><strong>Individual resident report</strong><span class="xs muted">Printable health report for one resident.</span></div>
        <div class="row report-pick">
          <label class="visually-hidden" for="report-res">Resident</label>
          <select class="input" id="report-res">${R.map(r => `<option value="${r.id}">${HG.esc(r.name)} (room ${r.room})</option>`).join('')}</select>
          <a class="btn secondary" id="report-open" href="report.html?id=${R[0].id}">Open report</a>
        </div>
      </div>`;
    $('#report-res').addEventListener('change', e => { $('#report-open').href = `report.html?id=${encodeURIComponent(e.target.value)}`; });
  }
  $('#report-list').addEventListener('click', e => {
    const b = e.target.closest('[data-csv]');
    if (!b) return;
    const rp = REPORTS.find(x => x.id === b.dataset.csv);
    const slug = rp.title.toLowerCase().replace(/\([^)]*\)/g, '').trim().replace(/[^a-z0-9]+/g, '-');
    downloadCsv(`kurrajong-gardens-${slug}-${stamp}.csv`, rp.rows());
  });

  const printBtn = $('#print-btn');
  printBtn.innerHTML = `${HG.icon.print}Print daily summary`;
  printBtn.addEventListener('click', () => { renderPrintSummary(); window.print(); });
  window.addEventListener('beforeprint', renderPrintSummary);

  function renderPrintSummary() {
    const c = counts(R);
    const sorted = [...R].sort((a, b) => HG.LEVELS[a.risk.level].rank - HG.LEVELS[b.risk.level].rank || b.risk.total - a.risk.total);
    $('#print-summary').innerHTML = `
      <h1>Daily ward summary</h1>
      <p class="small">${HG.FACILITY.full}. Readings at ${HG.fmtTime(LT)} on ${fmtDMY(LT)}. Printed by ${ME.name}, ${ME.short}.</p>
      <p class="small">${R.length} residents: ${c.high} high risk, ${c.watch} watch, ${c.low} low risk. ${ALERTS.length} alerts in the last 12 hours, median ${Math.round(median(ALERTS.filter(a => !a.open).map(a => a.mins)))} min to acknowledge.</p>
      <table class="table">
        <thead><tr><th>Resident</th><th>Room</th><th>Risk</th><th>Temp</th><th>HR</th><th>Hyd</th><th>Fluids today</th><th>Location</th></tr></thead>
        <tbody>${sorted.map(r => { const rd = r.readings[11]; return `<tr><td>${HG.esc(r.name)}</td><td>${r.room} ${r.wing}</td><td>${HG.LEVELS[r.risk.level].label} (${r.risk.total})</td><td>${rd.temp.toFixed(1)} °C</td><td>${rd.hr}</td><td>${rd.hyd}%</td><td>${r.fluids[6]} of ${r.fluidTarget} mL</td><td>${HG.ZONES[live[r.id].loc].label}</td></tr>`; }).join('')}</tbody>
      </table>
      <h2>UTI watch</h2>
      <ul class="small">${R.filter(r => utiSignals(r).status).map(r => `<li>${HG.esc(r.name)}: ${utiSignals(r).status === 'strong' ? 'strong signs' : 'possible signs'}${urineTests[r.id] ? ', urine test requested' : ''}.</li>`).join('')}</ul>
      <p class="xs">Demo only. All residents, staff and readings are made up. Not clinically validated.</p>`;
  }

  // =====================================================================
  // Boot
  // =====================================================================
  renderOverview();
  drawPlan();
  syncMotion();
  layoutDots();
  renderLocList();
  renderDoorFeed();
  renderAlerts();
  renderAlertChart();
  renderUti();
  renderStaff();
  renderReports();
  HG.demoNote('Locations move on their own every few seconds to show what live tracking looks like.');

  let rsTimer;
  if ('ResizeObserver' in window) {
    let lastW = 0;
    new ResizeObserver(entries => {
      const w = Math.round(entries[0].contentRect.width);
      if (w === lastW) return;
      lastW = w;
      clearTimeout(rsTimer);
      rsTimer = setTimeout(() => { drawPlan(); layoutDots(); renderAlertChart(); }, 60);
    }).observe($('#main'));
  }

  const focusId = HG.param('id');
  if (location.hash === '#map' || (focusId && HG.resident(focusId))) {
    requestAnimationFrame(() => {
      $('#map').scrollIntoView({ block: 'start' });
      if (focusId && HG.resident(focusId)) {
        const dot = $(`.m-dot[data-id="${focusId}"]`);
        if (dot) dot.classList.add('is-focus');
        openPop(focusId);
      }
    });
  }
})(window.HG = window.HG || {});
