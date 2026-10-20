/* Resident profile — what the resident's wristband / NFC tag opens.
   resident.html?id=<id> (defaults to margaret) */
(function (HG) {
  const AU = 'en-AU';
  const num = n => Number(n).toLocaleString(AU);
  const esc = HG.esc;
  const KEYS = ['temp', 'hr', 'hyd'];
  const tone = s => (s === 0 ? 'low' : s === 3 ? 'high' : 'watch');
  const withUnit = (key, v) => key === 'hyd' ? `${HG.fmtValue(key, v)}%` : `${HG.fmtValue(key, v)} ${HG.RULES[key].unit}`;
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const telHref = p => 'tel:' + p.replace(/[^\d+]/g, '');

  // ---------- Which resident? ----------
  const reqId = HG.param('id');
  let r = reqId ? HG.resident(reqId) : null;
  const missing = !r;
  if (!r) r = HG.resident('margaret');

  const latest = r.readings[r.readings.length - 1];
  const level = r.risk.level;
  const nurse = HG.staff(r.nurse);
  const zone = HG.ZONES[r.location] || { label: 'Unknown' };
  const gp = r.contacts.find(c => c.relation === 'GP');
  const people = r.contacts.filter(c => c.relation !== 'GP');

  // Fluids logged today on the ward page (hg-fluids: { id: [{ ml, time, by }] })
  function loggedToday() {
    try {
      const all = JSON.parse(localStorage.getItem('hg-fluids') || '{}');
      const today = new Date().toDateString();
      return (Array.isArray(all[r.id]) ? all[r.id] : []).filter(e => new Date(e.time).toDateString() === today && Number(e.ml) > 0);
    } catch (e) { return []; }
  }
  const todayLog = loggedToday();
  const todayMl = todayLog.reduce((t, e) => t + Number(e.ml), 0);

  document.title = `${r.preferred} (${r.name}) – HydroGuard`;
  HG.mountHeader({ context: `Resident profile, room ${r.room}` });

  // Plain words for each reading
  function statusWord(key, v) {
    const s = HG.scoreOne(key, v);
    if (s === 0) return 'Normal';
    const dir = v > HG.RULES[key].normal[1] ? 'high' : 'low';
    return s === 1 ? `Slightly ${dir}` : s === 2 ? dir[0].toUpperCase() + dir.slice(1) : `Very ${dir}`;
  }

  const KIND = {
    high: `${nurse.name.split(' ')[0]}, your nurse, has been told. Please drink a glass of water now, and tell staff if it stings when you go to the toilet or you feel hot or unwell.`,
    watch: 'Please have a glass of water or a cup of tea. We’ll check again at the next reading.',
    low: 'Everything looks normal. Keep sipping through the day.',
  };

  function when(d) {
    if (sameDay(d, new Date())) return HG.fmtTime(d);
    const y = new Date(); y.setDate(y.getDate() - 1);
    return sameDay(d, y) ? `Yesterday ${HG.fmtTime(d)}` : `${HG.fmtDate(d)} ${HG.fmtTime(d)}`;
  }

  // ---------- Sections ----------
  const note = missing ? `<p class="res-note small" style="order:0">${reqId
    ? `No resident matches “${esc(reqId)}”, so this shows ${esc(r.preferred)} as an example.`
    : `No resident was given in the link, so this shows ${esc(r.preferred)} as an example.`}</p>` : '';

  const allergy = r.allergies.length
    ? `<div class="fact allergy"><span class="k">Allergies</span><span class="v">${r.allergies.map(esc).join(', ')}</span></div>`
    : `<div class="fact"><span class="k">Allergies</span><span class="v">No known allergies</span></div>`;

  const identity = `
    <section class="section res-id" style="order:1" aria-labelledby="res-name">
      <div class="block lilac res-card">
        <div class="res-card-top">
          ${HG.avatar(r, 'xl')}
          <div class="res-names">
            <h1 id="res-name">${esc(r.preferred)}</h1>
            <p class="res-full">${esc(r.name)}</p>
          </div>
        </div>
        <dl class="res-meta">
          <div><dt>Room</dt><dd>${esc(r.room)}, ${esc(r.wing)} wing</dd></div>
          <div><dt>Born</dt><dd>${esc(r.dob)} (${r.age})</dd></div>
          <div><dt>Resident ID</dt><dd>${esc(r.residentId)}</dd></div>
          <div><dt>Wristband</dt><dd>${esc(r.band)}</dd></div>
        </dl>
      </div>
      <div class="res-facts">
        <div class="fact resus"><span class="k">Resuscitation</span><span class="v">${esc(r.resus.status)}</span><span class="d">${esc(r.resus.detail)}</span></div>
        ${allergy}
        <div class="fact nurse">
          ${HG.avatar(nurse)}
          <div class="nurse-text">
            <span class="k">Nurse on shift</span>
            <strong>${esc(nurse.name)} ${esc(nurse.short)}</strong>
            <span class="small muted">${esc(nurse.role)}, ${esc(nurse.shift)}</span>
          </div>
          <a class="btn secondary" href="${telHref(nurse.phone)}" aria-label="Call ${esc(nurse.name)} on ${esc(nurse.phone)}">${HG.icon.phone}Call</a>
        </div>
      </div>
    </section>`;

  const keyEvents = r.events.slice(0, 4).map(e =>
    `<li><span class="ev-time">${when(e.time)}</span><span>${esc(e.text)}</span></li>`).join('');
  const key = `
    <section class="section res-key" style="order:3" aria-labelledby="key-h">
      <div class="section-head"><h2 id="key-h">My key</h2><span class="small muted">Wristband ${esc(r.band)}</span></div>
      <a class="block lilac key-btn" href="door.html?room=${encodeURIComponent(r.room)}&amp;id=${encodeURIComponent(r.id)}">
        ${HG.icon.key}
        <span><strong>Open my door</strong><span class="small">Room ${esc(r.room)}, ${esc(r.wing)} wing</span></span>
      </a>
      <p class="res-loc">${HG.icon.pin}<span>Now in: <strong>${esc(zone.label)}${r.location === 'room' ? ` (room ${esc(r.room)})` : ''}</strong>. Seen ${HG.fmtAgo(r.events[0].time)}.</span></p>
      <h3 class="res-sub">Recent doors and places</h3>
      <ol class="ruled res-events">${keyEvents}</ol>
    </section>`;

  const readingRows = KEYS.map(k => {
    const v = latest[k], s = r.risk.parts[k], rule = HG.RULES[k];
    return `<div class="res-reading callout">
        <span class="label">${rule.label}<span class="res-status s${s}">${statusWord(k, v)}</span></span>
        <span class="line ${tone(s)}"></span>
        <span class="reading">${HG.fmtValue(k, v)}<span class="unit">${rule.unit}</span></span>
      </div>`;
  }).join('');
  const readings = `
    <section class="section res-readings" style="order:2" aria-labelledby="read-h">
      <div class="section-head"><h2 id="read-h">Latest readings</h2><span class="small muted">${when(latest.time)}, ${HG.fmtAgo(latest.time)}</span></div>
      <div class="res-reading-list">${readingRows}</div>
      <div class="res-advice ${level}">
        <div class="row">${HG.riskChip(level)}<span class="small muted">Score ${r.risk.total} of 9</span></div>
        <p class="res-kind">${esc(KIND[level])}</p>
        <p class="small muted">For staff: ${esc(HG.LEVELS[level].advice)}</p>
      </div>
    </section>`;

  // 7-day fluids, ending yesterday
  const dayOf = i => { const d = new Date(HG.LATEST_TIME); d.setDate(d.getDate() - (7 - i)); return d; };
  const flMax = Math.max(r.fluidTarget * 1.15, ...r.fluids);
  const flRows = r.fluids.map((ml, i) => {
    const ratio = ml / r.fluidTarget;
    const t = ratio >= 0.9 ? 'low' : ratio >= 0.7 ? 'watch' : 'high';
    return `<li class="fl-row">
        <span class="fl-day">${i === 6 ? 'Yesterday' : HG.fmtDay(dayOf(i))}</span>
        <span class="fl-track" aria-hidden="true"><span class="fl-fill ${t}" style="width:${(ml / flMax * 100).toFixed(1)}%"></span><span class="fl-target" style="left:${(r.fluidTarget / flMax * 100).toFixed(1)}%"></span></span>
        <span class="fl-val">${num(ml)} mL</span>
      </li>`;
  }).join('');
  const metDays = r.fluids.filter(ml => ml >= r.fluidTarget).length;
  const todayRow = `<li class="fl-row fl-today">
        <span class="fl-day">Today so far</span>
        <span class="fl-track" aria-hidden="true"><span class="fl-fill so-far" style="width:${(Math.min(todayMl, flMax) / flMax * 100).toFixed(1)}%"></span><span class="fl-target" style="left:${(r.fluidTarget / flMax * 100).toFixed(1)}%"></span></span>
        <span class="fl-val">${num(todayMl)} mL</span>
      </li>`;
  const todayText = todayLog.length
    ? `Today: ${todayLog.length} ${todayLog.length === 1 ? 'drink' : 'drinks'} logged by staff, last at ${HG.fmtTime(new Date(todayLog[todayLog.length - 1].time))}.`
    : 'No drinks logged by staff yet today.';

  const nb = r.nightBathroom;
  const nbMax = Math.max(4, ...nb);
  const nbCols = nb.map((n, i) => {
    const t = n >= 5 ? 'high' : n >= 3 ? 'watch' : 'low';
    const label = i === 6 ? 'Last night' : dayOf(i).toLocaleDateString(AU, { weekday: 'short' });
    return `<li><span class="nb-count">${n}</span><span class="nb-wrap"><span class="nb-bar ${t}" style="height:${Math.max(4, n / nbMax * 100)}%"></span></span><span class="nb-day">${label}</span></li>`;
  }).join('');
  const nbUp = nb[6] - nb[0] >= 2;
  const nbText = nbUp
    ? `${nb[6]} visits last night, up from ${nb[0]} a week ago. More night-time visits can be an early sign of a UTI.`
    : `${nb[6]} ${nb[6] === 1 ? 'visit' : 'visits'} last night, about the same as a week ago.`;

  const trends = `
    <section class="section res-trends" style="order:4" aria-labelledby="trend-h">
      <div class="section-head"><h2 id="trend-h">Trends</h2></div>
      <div class="res-controls">
        <div class="seg" role="group" aria-label="Measure" data-group="key">
          <button type="button" data-v="temp" aria-pressed="true">Temperature</button>
          <button type="button" data-v="hr" aria-pressed="false">Heart rate</button>
          <button type="button" data-v="hyd" aria-pressed="false">Hydration</button>
        </div>
        <div class="seg" role="group" aria-label="Time range" data-group="range">
          <button type="button" data-v="24h" aria-pressed="true">Last 24 hours</button>
          <button type="button" data-v="30d" aria-pressed="false">Last 30 days</button>
        </div>
      </div>
      <div id="trend-chart" class="res-chart"></div>
      <p id="trend-summary" class="res-trend-sum" aria-live="polite"></p>
      <p class="xs faint">Shaded band is the normal range.</p>

      <div class="grid-2 res-mini">
        <div>
          <h3 class="res-sub">Fluids, last 7 days</h3>
          <ul class="fl-list" aria-label="Fluid intake by day">${flRows}${todayRow}</ul>
          <p class="xs muted res-legend"><span class="fl-key" aria-hidden="true"></span>Line marks the ${num(r.fluidTarget)} mL daily target. Met on ${metDays} of 7 days.</p>
          <p class="xs muted">${todayText}</p>
        </div>
        <div>
          <h3 class="res-sub">Night-time bathroom visits</h3>
          <ul class="nb-list" aria-label="Bathroom visits each night">${nbCols}</ul>
          <p class="small res-nb-text">${nbText}</p>
        </div>
      </div>
    </section>`;

  const contactRows = people.map(c => {
    const tags = [
      c.primary ? '<span class="chip me">Primary contact</span>' : '',
      c.emergency ? '<span class="chip plain">Emergency contact</span>' : '',
      c.poa ? '<span class="chip plain">Enduring guardian / power of attorney</span>' : '',
    ].join('');
    return `<li class="ct">
        <div class="ct-who"><strong>${esc(c.name)}</strong> <span class="muted">${esc(c.relation)}</span>${tags ? `<div class="ct-tags">${tags}</div>` : ''}</div>
        <a class="btn secondary ct-call" href="${telHref(c.phone)}" aria-label="Call ${esc(c.name)} on ${esc(c.phone)}">${HG.icon.phone}${esc(c.phone)}</a>
      </li>`;
  }).join('');
  const gpRow = gp
    ? `<li class="ct"><div class="ct-who"><strong>${esc(gp.name)}</strong> <span class="muted">GP</span></div><a class="btn secondary ct-call" href="${telHref(gp.phone)}" aria-label="Call ${esc(gp.name)} on ${esc(gp.phone)}">${HG.icon.phone}${esc(gp.phone)}</a></li>`
    : '<li class="ct"><div class="ct-who"><strong>GP</strong> <span class="muted">Not recorded. Ask the RN in charge.</span></div></li>';
  const contacts = `
    <section class="section res-contacts" style="order:5" aria-labelledby="ct-h">
      <div class="section-head"><h2 id="ct-h">Key contacts</h2></div>
      <ul class="ruled ct-list">${contactRows}${gpRow}</ul>
    </section>`;

  const care = `
    <section class="section res-care" style="order:6" aria-labelledby="care-h">
      <div class="section-head"><h2 id="care-h">Care notes</h2></div>
      <dl class="ruled care-list">
        <div><dt>Conditions</dt><dd>${r.conditions.map(esc).join('<br>')}</dd></div>
        <div><dt>Mobility</dt><dd>${esc(r.mobility)}</dd></div>
        <div><dt>Diet</dt><dd>${esc(r.diet)}</dd></div>
        <div><dt>Fluid target</dt><dd>${num(r.fluidTarget)} mL a day</dd></div>
        <div class="likes"><dt>What I like</dt><dd>${esc(r.likes)}</dd></div>
      </dl>
    </section>`;

  const actions = `
    <div class="res-actions" style="order:7">
      <a class="btn" href="report.html?id=${encodeURIComponent(r.id)}">${HG.icon.doc}View health report</a>
      <a class="btn secondary" href="nurse.html?id=${encodeURIComponent(r.id)}">${HG.icon.back}Back to ward <span class="xs muted">(staff only)</span></a>
    </div>`;

  const main = document.getElementById('main');
  main.innerHTML = `${note}
    <div class="res-col res-left">${identity}${key}${contacts}${care}</div>
    <div class="res-col res-right">${readings}${trends}</div>
    ${actions}`;

  // ---------- Trend chart ----------
  const state = { key: 'temp', range: '24h' };
  const points = () => (state.range === '24h' ? r.readings : r.history).map(p => ({ time: p.time, value: p[state.key] }));

  function summary(p) {
    const a = p[0].value, b = p[p.length - 1].value, k = state.key;
    const diff = b - a;
    const steady = { temp: 0.2, hr: 3, hyd: 3 }[k];
    let since;
    if (state.range === '24h') {
      const t0 = p[0].time;
      since = `since ${HG.fmtTime(t0)}${sameDay(t0, p[p.length - 1].time) ? '' : ' yesterday'}`;
    } else since = `since ${HG.fmtDate(p[0].time)} (daily average)`;
    if (Math.abs(diff) < steady) return `Steady ${since}: ${withUnit(k, a)} then, ${withUnit(k, b)} now.`;
    const amt = k === 'temp' ? `${Math.abs(diff).toFixed(1)} °C` : k === 'hr' ? `${Math.round(Math.abs(diff))} bpm` : `${Math.round(Math.abs(diff))} points`;
    return `${diff > 0 ? 'Up' : 'Down'} ${amt} ${since}, from ${withUnit(k, a)} to ${withUnit(k, b)}.`;
  }

  function draw() {
    const host = document.getElementById('trend-chart');
    host.innerHTML = '';
    const el = document.createElement('div');
    host.appendChild(el);
    const p = points();
    HG.chart(el, { points: p, key: state.key, xFormat: state.range === '24h' ? 'time' : 'date', height: 180, scores: true });
    document.getElementById('trend-summary').textContent = summary(p);
  }

  HG.$$('.res-controls .seg').forEach(seg => {
    seg.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      HG.$$('button', seg).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      state[seg.dataset.group] = b.dataset.v;
      draw();
    });
  });
  draw();

  HG.demoNote();
})(window.HG);
