/* HydroGuard RN ward dashboard (nurse.html).
   Scoring always comes from HG.scoreReading / HG.scoreOne — never re-implemented here.
   Demo interactions persist in localStorage (hg-acks, hg-escalations, hg-fluids, hg-notes). */
(function (HG) {
  const $ = HG.$;
  const ME = HG.staff('priya');
  const ME_NAME = `${ME.name} ${ME.short}`;
  const KEYS = ['temp', 'hr', 'hyd'];
  const SHORT = { temp: 'Temp', hr: 'HR', hyd: 'Hyd' };
  const LOWER = { temp: 'temperature', hr: 'heart rate', hyd: 'hydration' };
  const FLUID_PRESETS = [100, 150, 200, 250];
  const DESKTOP = matchMedia('(min-width: 1000px)');

  HG.mountHeader({
    context: 'Banksia and Waratah wings, ' + HG.SHIFT.split(',')[0].toLowerCase(),
    tabs: [
      { href: 'nurse.html', label: 'Ward', icon: 'people', current: true },
      { href: 'manager.html#map', label: 'Locations', icon: 'map' },
      { href: 'manager.html', label: 'Manager', icon: 'chart' },
      { href: 'index.html', label: 'Demo', icon: 'home' },
    ],
  });

  // ---------- Storage (fails quietly; in-memory copy keeps the page working) ----------
  function load(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } }
  const state = {
    acks: load('hg-acks', {}),               // { id: { by, time } }
    escalations: load('hg-escalations', {}), // { id: [{ by, time, to }] }
    fluids: load('hg-fluids', {}),           // { id: [{ ml, time, by }] }
    notes: load('hg-notes', {}),             // { id: [{ text, time, by }] }
  };

  // ---------- Helpers ----------
  const hourLabel = d => d.getMinutes() ? HG.fmtTime(d) : HG.fmtTime(d).replace(':00', '');
  const fullDate = d => d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const stamp = iso => { const d = new Date(iso); return `${HG.fmtTime(d)}, ${fullDate(d)}`; };
  const isToday = iso => new Date(iso).toDateString() === new Date().toDateString();
  const latest = r => r.readings[r.readings.length - 1];
  const scoreBand = s => s === 0 ? 'low' : s === 3 ? 'high' : 'watch';
  const pts = n => `${n} ${n === 1 ? 'point' : 'points'}`;
  const gp = r => r.contacts.find(c => c.relation === 'GP');
  const fmtMl = n => n.toLocaleString('en-AU');
  const unitFor = k => HG.RULES[k].unit === '%' ? '%' : ` ${HG.RULES[k].unit}`;
  const listNames = arr => arr.length < 2 ? arr.join('') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;

  // Plain-English reason for the level that HG.scoreReading returned.
  function reason(s) {
    const with3 = KEYS.filter(k => s.parts[k] === 3).map(k => LOWER[k]);
    const with2 = KEYS.filter(k => s.parts[k] === 2).map(k => LOWER[k]);
    if (s.level === 'high') {
      if (with3.length) return `High because ${listNames(with3)} scored 3`;
      return `High because the total is ${s.total}, which is 5 or more`;
    }
    if (s.level === 'watch') {
      const bits = [];
      if (s.total >= 2) bits.push(`the total is ${s.total} (2 to 4)`);
      if (with2.length) bits.push(`${listNames(with2)} scored 2`);
      return `Watch because ${bits.join(' and ')}`;
    }
    return `Low because the total is ${s.total} and nothing scored 2 or more`;
  }

  const sorted = () => HG.RESIDENTS.slice().sort((a, b) =>
    HG.LEVELS[a.risk.level].rank - HG.LEVELS[b.risk.level].rank || b.risk.total - a.risk.total || a.preferred.localeCompare(b.preferred));
  const counts = () => {
    const c = { all: HG.RESIDENTS.length, high: 0, watch: 0, low: 0 };
    HG.RESIDENTS.forEach(r => c[r.risk.level]++);
    return c;
  };
  const fluidsToday = r => (r.fluids[r.fluids.length - 1] || 0) +
    (state.fluids[r.id] || []).filter(e => isToday(e.time)).reduce((t, e) => t + e.ml, 0);

  // ---------- Header text ----------
  $('#who').textContent = `${ME_NAME}, ${ME.shift.toLowerCase()}. ${HG.FACILITY.name}.`;

  // ---------- Shift summary ----------
  function renderShift() {
    const c = counts();
    const waiting = HG.RESIDENTS.filter(r => r.risk.level === 'high' && !state.acks[r.id]).length;
    const next = new Date(HG.LATEST_TIME.getTime() + 2 * 3600e3);
    $('#shift').innerHTML = `
      <div class="shift-main">
        <p class="shift-big serif">${waiting ? `${waiting} need${waiting === 1 ? 's' : ''} review now` : 'No one waiting for review'}</p>
        <p class="shift-times small">Readings at ${hourLabel(HG.LATEST_TIME)}. Next reading due ${hourLabel(next)}.</p>
      </div>
      <dl class="shift-counts">
        <div><dt>High risk</dt><dd>${c.high}</dd></div>
        <div><dt>Watch</dt><dd>${c.watch}</dd></div>
        <div><dt>Low risk</dt><dd>${c.low}</dd></div>
      </dl>`;
  }

  // ---------- Alerts ----------
  function renderAlerts() {
    const highs = sorted().filter(r => r.risk.level === 'high');
    $('#alerts').hidden = !highs.length;
    $('#alert-list').innerHTML = highs.map(r => {
      const ack = state.acks[r.id];
      const esc = (state.escalations[r.id] || []).slice(-1)[0];
      const status = [
        ack ? `Acknowledged by ${HG.esc(ack.by)} at ${HG.fmtTime(new Date(ack.time))}` : '',
        esc ? `Escalated to GP at ${HG.fmtTime(new Date(esc.time))}` : '',
      ].filter(Boolean).join('. ');
      return `
      <li class="alert-row${ack ? ' is-ack' : ''}" data-id="${r.id}">
        ${HG.avatar(r)}
        <div class="alert-text">
          <button type="button" class="link-btn" data-open="${r.id}">${HG.esc(r.preferred)}, room ${HG.esc(r.room)}</button>
          <span class="small">${reason(r.risk)}. Score ${r.risk.total}/9.</span>
          ${ack ? '' : `<span class="xs high-ink">${HG.LEVELS.high.advice}</span>`}
          ${status ? `<span class="xs muted">${status}.</span>` : ''}
        </div>
        <div class="alert-actions">
          <button type="button" class="btn${ack ? ' secondary' : ''}" data-ack="${r.id}" ${ack ? 'disabled' : ''}>${ack ? 'Acknowledged' : 'Acknowledge'}</button>
          <button type="button" class="btn secondary" data-escalate="${r.id}">Escalate to GP</button>
        </div>
      </li>`;
    }).join('');
  }

  function acknowledge(id) {
    state.acks[id] = { by: ME_NAME, time: new Date().toISOString() };
    save('hg-acks', state.acks);
    HG.toast('Alert acknowledged');
    refresh();
  }
  function escalate(id) {
    const r = HG.resident(id);
    const doc = gp(r);
    (state.escalations[id] = state.escalations[id] || []).push({ by: ME_NAME, time: new Date().toISOString(), to: doc ? doc.name : 'GP' });
    save('hg-escalations', state.escalations);
    HG.toast(`Escalated to ${doc ? doc.name : 'the GP'} for ${r.preferred}`);
    refresh();
  }

  // ---------- Filters + search ----------
  let filter = 'all';
  let query = '';
  function renderFilters() {
    const c = counts();
    const opts = [['all', 'All'], ['high', 'High'], ['watch', 'Watch'], ['low', 'Low']];
    $('#filters').innerHTML = opts.map(([k, label]) =>
      `<button type="button" data-filter="${k}" aria-pressed="${filter === k}">${label} <span class="count">${c[k]}</span></button>`).join('');
  }

  // ---------- Resident list ----------
  let selected = null;
  function valueCell(r, k) {
    const v = latest(r)[k];
    const s = r.risk.parts[k];
    return `<span class="val s${s}"><span class="visually-hidden">${HG.RULES[k].label} </span>${HG.fmtValue(k, v)}<span class="visually-hidden">${unitFor(k)}, ${pts(s)}</span></span>`;
  }
  function renderList() {
    const q = query.trim().toLowerCase();
    const rows = sorted().filter(r => (filter === 'all' || r.risk.level === filter) &&
      (!q || [r.name, r.preferred, r.room, `room ${r.room}`].some(s => s.toLowerCase().includes(q))));
    $('#res-list').innerHTML = rows.map(r => `
      <li>
        <button type="button" class="res-row" data-open="${r.id}" ${selected === r.id && DESKTOP.matches ? 'aria-current="true"' : ''}>
          ${HG.avatar(r)}
          <span class="res-name">
            <strong>${HG.esc(r.preferred)}</strong>
            <span class="xs muted">Room ${HG.esc(r.room)}<span class="res-wing">, ${HG.esc(r.wing)}</span></span>
            <span class="chip-inline" aria-hidden="true">${HG.riskChip(r.risk.level)}</span>
          </span>
          ${KEYS.map(k => valueCell(r, k)).join('')}
          <span class="res-total"><span class="visually-hidden">Total score </span>${r.risk.total}<span class="faint">/9</span></span>
          <span class="col-risk">${HG.riskChip(r.risk.level)}</span>
        </button>
      </li>`).join('');
    const empty = $('#empty');
    empty.hidden = rows.length > 0;
    if (!rows.length) empty.textContent = q ? `No residents match “${query.trim()}”.` : 'No residents at this level right now.';
  }

  // ---------- Detail panel ----------
  const pane = $('#detail-pane');
  const sheetBody = HG.h('<div class="sheet-body"></div>');
  const sheet = HG.sheet(sheetBody);
  sheet.el.setAttribute('aria-label', 'Resident details');
  sheet.el.setAttribute('tabindex', '-1');

  function detailHTML(r) {
    const l = latest(r);
    const s = r.risk;
    const zone = HG.ZONES[r.location] || { label: 'Unknown' };
    const where = r.location === 'room' ? `${zone.label} (room ${HG.esc(r.room)})` : zone.label;
    const allergies = r.allergies.length ? HG.esc(r.allergies.join(', ')) : 'No known allergies';
    return `
      <div class="d-head">
        ${HG.avatar(r, 'lg')}
        <div class="d-id">
          <h2>${HG.esc(r.preferred)} <span class="faint d-full">${HG.esc(r.name)}</span></h2>
          <p class="small muted">Room ${HG.esc(r.room)}, ${HG.esc(r.wing)} wing. Age ${r.age}.</p>
          ${HG.riskChip(s.level)}
        </div>
        <button type="button" class="icon-btn d-close" data-close aria-label="Close details">${HG.icon.close}</button>
      </div>

      <dl class="d-facts ruled small">
        <div><dt>Resus status</dt><dd><strong>${HG.esc(r.resus.status)}</strong> <span class="muted">${HG.esc(r.resus.detail)}</span></dd></div>
        <div><dt>Allergies</dt><dd class="${r.allergies.length ? 'allergy' : ''}">${allergies}</dd></div>
        <div><dt>Where now</dt><dd class="d-where">${HG.icon.pin}<span>${HG.esc(where)}</span> <a href="manager.html?id=${r.id}#map">Find on map</a></dd></div>
      </dl>

      <div class="d-links">
        <a class="btn secondary" href="resident.html?id=${r.id}">Open profile</a>
        <a class="btn secondary" href="report.html?id=${r.id}">Health report</a>
      </div>

      <section class="d-sec" aria-labelledby="cur-h">
        <h3 id="cur-h">Latest readings <span class="small muted">at ${hourLabel(l.time)}</span></h3>
        <div class="d-callouts">
          ${KEYS.map(k => `
          <div class="callout">
            <span class="label">${HG.RULES[k].label}<br><span class="chip plain pts s${s.parts[k]}">${pts(s.parts[k])}</span></span>
            <span class="line ${scoreBand(s.parts[k])}"></span>
            <span class="reading">${HG.fmtValue(k, l[k])}<span class="unit">${HG.RULES[k].unit}</span></span>
          </div>`).join('')}
        </div>
      </section>

      <section class="d-sec" aria-labelledby="trend-h">
        <div class="row-between wrap-row">
          <h3 id="trend-h">Last 22 hours</h3>
          <div class="seg" role="group" aria-label="Choose reading to chart">
            ${KEYS.map((k, i) => `<button type="button" data-metric="${k}" aria-pressed="${i === 0}">${SHORT[k]}</button>`).join('')}
          </div>
        </div>
        <div class="d-chart" data-chart></div>
        <p class="xs muted" data-chart-cap></p>
      </section>

      <section class="d-sec" aria-labelledby="score-h">
        <h3 id="score-h">Score breakdown</h3>
        ${breakdownHTML(s, l, 'rec')}
      </section>

      <section class="d-sec sim" aria-labelledby="sim-h">
        <div class="row-between wrap-row">
          <h3 id="sim-h">What if? <span class="chip plain sim-tag">Simulation</span></h3>
          <button type="button" class="btn ghost" data-sim-reset>Reset to recorded values</button>
        </div>
        <p class="xs muted">Try different numbers to see how the score would change. This does not change ${HG.esc(r.preferred)}’s record.</p>
        ${KEYS.map(k => {
          const R = HG.RULES[k];
          return `
          <div class="sim-row">
            <label for="sim-n-${k}">${R.label} <span class="faint">(${R.unit})</span></label>
            <input class="input sim-num" id="sim-n-${k}" type="number" inputmode="decimal" data-sim-num="${k}" min="${R.min}" max="${R.max}" step="${R.step}" value="${HG.fmtValue(k, l[k])}">
            <span class="sim-pts" data-sim-pts="${k}" aria-live="polite"></span>
            <input type="range" class="sim-range" data-sim-range="${k}" min="${R.min}" max="${R.max}" step="${R.step}" value="${l[k]}" aria-label="${R.label} slider">
          </div>`;
        }).join('')}
        <div class="sim-result" data-sim-result aria-live="polite"></div>
      </section>

      <section class="d-sec" aria-labelledby="fl-h">
        <h3 id="fl-h">Fluids today</h3>
        <div data-fluids></div>
        <div class="fluid-btns" role="group" aria-label="Log fluids for ${HG.esc(r.preferred)}">
          ${FLUID_PRESETS.map(ml => `<button type="button" class="btn secondary" data-log="${ml}">${ml} mL</button>`).join('')}
        </div>
      </section>

      <section class="d-sec" aria-labelledby="note-h">
        <h3 id="note-h">Handover notes</h3>
        <label class="visually-hidden" for="note-${r.id}">Handover note for ${HG.esc(r.preferred)}</label>
        <textarea class="input note-box" id="note-${r.id}" rows="3" placeholder="What does the next shift need to know about ${HG.esc(r.preferred)}?"></textarea>
        <div class="row"><button type="button" class="btn" data-save-note>Save note</button></div>
        <ul class="notes ruled small" data-notes></ul>
      </section>`;
  }

  function breakdownHTML(s, values, tag) {
    return `
      <table class="table breakdown">
        <thead><tr><th scope="col">Reading</th><th scope="col">Value</th><th scope="col">Points</th></tr></thead>
        <tbody>
          ${KEYS.map(k => `<tr><th scope="row">${HG.RULES[k].label}</th><td>${HG.fmtValue(k, values[k])}${unitFor(k)}</td><td><span class="val s${s.parts[k]}">${s.parts[k]}</span></td></tr>`).join('')}
        </tbody>
        <tfoot><tr><th scope="row">Total</th><td></td><td><strong>${s.total}</strong><span class="faint">/9</span></td></tr></tfoot>
      </table>
      <p class="why"${tag ? ` data-why="${tag}"` : ''}>${HG.riskChip(s.level)} <span>${reason(s)}.</span></p>
      <p class="xs muted">${HG.LEVELS[s.level].advice}</p>`;
  }

  // Wire one rendered panel (desktop pane or sheet body) to resident r.
  function mountDetail(container, r) {
    container.innerHTML = detailHTML(r);
    const l = latest(r);

    // Trend chart
    const chartEl = container.querySelector('[data-chart]');
    const cap = container.querySelector('[data-chart-cap]');
    let chartHost = chartEl;
    const redraw = key => {
      const fresh = chartHost.cloneNode(false); chartHost.replaceWith(fresh); chartHost = fresh;
      HG.chart(fresh, { points: r.readings.map(p => ({ time: p.time, value: p[key] })), key, xFormat: 'time', height: 150, scores: true });
      const R = HG.RULES[key];
      cap.textContent = `${R.label}, every 2 hours. Shaded area is the normal range (${HG.fmtValue(key, R.normal[0])} to ${HG.fmtValue(key, R.normal[1])}${unitFor(key)}). Dot colour shows the points each reading scored.`;
    };
    // Draw after layout so the chart reads the panel width.
    requestAnimationFrame(() => redraw('temp'));
    container.querySelectorAll('[data-metric]').forEach(b => b.addEventListener('click', () => {
      container.querySelectorAll('[data-metric]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      redraw(b.dataset.metric);
    }));

    // What-if simulator
    const sim = { temp: l.temp, hr: l.hr, hyd: l.hyd };
    const clamp = (k, v) => {
      const R = HG.RULES[k];
      const stepped = Math.round(v / R.step) * R.step;
      return Math.min(R.max, Math.max(R.min, Number(stepped.toFixed(R.step < 1 ? 1 : 0))));
    };
    const paintSim = () => {
      const s = HG.scoreReading(sim);
      KEYS.forEach(k => {
        const el = container.querySelector(`[data-sim-pts="${k}"]`);
        el.className = `sim-pts val s${s.parts[k]}`;
        el.textContent = pts(s.parts[k]);
      });
      const changed = KEYS.some(k => sim[k] !== l[k]);
      container.querySelector('[data-sim-result]').innerHTML = `
        <p class="sim-total"><span class="reading">${s.total}<span class="unit">/9</span></span> ${HG.riskChip(s.level)}</p>
        <p class="small">${reason(s)}.</p>
        <p class="xs muted">${changed ? `Recorded score is ${r.risk.total}/9, ${HG.LEVELS[r.risk.level].label.toLowerCase()}.` : 'Showing the recorded values.'}</p>`;
    };
    KEYS.forEach(k => {
      const num = container.querySelector(`[data-sim-num="${k}"]`);
      const range = container.querySelector(`[data-sim-range="${k}"]`);
      num.addEventListener('input', () => {
        const v = parseFloat(num.value);
        if (!isFinite(v)) return;
        sim[k] = clamp(k, v); range.value = sim[k]; paintSim();
      });
      num.addEventListener('change', () => { num.value = HG.fmtValue(k, sim[k]); });
      range.addEventListener('input', () => {
        sim[k] = clamp(k, parseFloat(range.value)); num.value = HG.fmtValue(k, sim[k]); paintSim();
      });
    });
    container.querySelector('[data-sim-reset]').addEventListener('click', () => {
      KEYS.forEach(k => {
        sim[k] = l[k];
        container.querySelector(`[data-sim-num="${k}"]`).value = HG.fmtValue(k, l[k]);
        container.querySelector(`[data-sim-range="${k}"]`).value = l[k];
      });
      paintSim();
      HG.toast('Reset to recorded values');
    });
    paintSim();

    // Fluids
    const paintFluids = () => {
      const total = fluidsToday(r);
      const pct = Math.min(100, Math.round(total / r.fluidTarget * 100));
      const entries = (state.fluids[r.id] || []).filter(e => isToday(e.time)).slice(-3).reverse();
      container.querySelector('[data-fluids]').innerHTML = `
        <p class="small"><strong>${fmtMl(total)} mL</strong> of ${fmtMl(r.fluidTarget)} mL target <span class="muted">(${pct}%)</span></p>
        <div class="bar" role="img" aria-label="${pct}% of today’s fluid target"><span style="width:${pct}%"></span></div>
        ${entries.length ? `<p class="xs muted">Logged here: ${entries.map(e => `${e.ml} mL at ${HG.fmtTime(new Date(e.time))}`).join(', ')}.</p>` : ''}`;
    };
    paintFluids();
    container.querySelectorAll('[data-log]').forEach(b => b.addEventListener('click', () => {
      const ml = Number(b.dataset.log);
      (state.fluids[r.id] = state.fluids[r.id] || []).push({ ml, time: new Date().toISOString(), by: ME_NAME });
      save('hg-fluids', state.fluids);
      paintFluids();
      HG.toast(`${ml} mL logged for ${r.preferred}`);
    }));

    // Handover notes
    const box = container.querySelector('.note-box');
    const paintNotes = () => {
      const notes = (state.notes[r.id] || []).slice().reverse();
      container.querySelector('[data-notes]').innerHTML = notes.length
        ? notes.map(n => `<li><span class="xs muted">${stamp(n.time)}, ${HG.esc(n.by)}</span><br>${HG.esc(n.text)}</li>`).join('')
        : '<li class="muted">No handover notes yet this shift.</li>';
    };
    paintNotes();
    container.querySelector('[data-save-note]').addEventListener('click', () => {
      const text = box.value.trim();
      if (!text) { box.focus(); HG.toast('Write a note first'); return; }
      (state.notes[r.id] = state.notes[r.id] || []).push({ text, time: new Date().toISOString(), by: ME_NAME });
      save('hg-notes', state.notes);
      box.value = '';
      paintNotes();
      HG.toast('Note saved');
    });

    const closeBtn = container.querySelector('[data-close]');
    closeBtn.addEventListener('click', () => sheet.close());
  }

  function openResident(id, fromClick) {
    const r = HG.resident(id);
    if (!r) return;
    selected = id;
    if (DESKTOP.matches) {
      mountDetail(pane, r);
      renderList();
      if (fromClick) pane.scrollTop = 0;
    } else {
      mountDetail(sheetBody, r);
      sheet.el.scrollTop = 0;
      sheet.open();
      sheet.el.focus({ preventScroll: true });
    }
  }

  // ---------- Rules table ----------
  function renderRules() {
    const rows = [3, 2, 1, 0].map(score => `
      <tr><th scope="row"><span class="val s${score}">${score}</span></th>
      ${KEYS.map(k => `<td>${HG.esc(HG.RULES[k].bands.find(b => b.score === score).text)}</td>`).join('')}</tr>`).join('');
    $('#rules-table').innerHTML = `
      <table class="table rules-t">
        <thead><tr><th scope="col">Points</th>${KEYS.map(k => `<th scope="col">${HG.RULES[k].label} (${HG.RULES[k].unit})</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    $('#level-rules').innerHTML = `
      <li>${HG.riskChip('high')} Total of 5 or more, or any one reading scores 3.</li>
      <li>${HG.riskChip('watch')} Total of 2 to 4, or any one reading scores 2.</li>
      <li>${HG.riskChip('low')} Total of 0 or 1.</li>`;
  }

  // ---------- Events ----------
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-open],[data-ack],[data-escalate],[data-filter]');
    if (!t) return;
    if (t.dataset.open) openResident(t.dataset.open, true);
    else if (t.dataset.ack) acknowledge(t.dataset.ack);
    else if (t.dataset.escalate) escalate(t.dataset.escalate);
    else if (t.dataset.filter) { filter = t.dataset.filter; renderFilters(); renderList(); }
  });
  $('#search').addEventListener('input', e => { query = e.target.value; renderList(); });

  DESKTOP.addEventListener('change', () => {
    if (DESKTOP.matches) { sheet.close(); sheetBody.innerHTML = ''; openResident(selected || sorted()[0].id); }
    else { pane.innerHTML = ''; renderList(); }
  });

  function refresh() { renderShift(); renderAlerts(); renderFilters(); renderList(); }

  refresh();
  renderRules();
  HG.demoNote();

  const start = HG.param('id');
  if (start && HG.resident(start)) openResident(start);
  else if (DESKTOP.matches) openResident(sorted()[0].id);
})(window.HG = window.HG || {});
