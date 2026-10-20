/* Printable one-page resident health report — report.html?id=<id> (defaults to margaret) */
(function (HG) {
  const AU = 'en-AU';
  const esc = HG.esc;
  const num = n => Number(n).toLocaleString(AU);
  const dmy = d => d.toLocaleDateString(AU, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const KEYS = ['temp', 'hr', 'hyd'];
  const withUnit = (key, v) => key === 'hyd' ? `${HG.fmtValue(key, v)}%` : `${HG.fmtValue(key, v)} ${HG.RULES[key].unit}`;

  const reqId = HG.param('id');
  let r = reqId ? HG.resident(reqId) : null;
  const missing = !r;
  if (!r) r = HG.resident('margaret');

  const latest = r.readings[r.readings.length - 1];
  const first = r.readings[0];
  const risk = r.risk;
  const P = r.sex === 'F' ? { sub: 'she', pos: 'her' } : { sub: 'he', pos: 'his' };
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const preparedBy = HG.staff('priya');
  const now = new Date();

  // Ward-page records (written by nurse.js); fail quietly without storage
  const store = key => { try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) { return {}; } };
  const stamp = iso => { const d = new Date(iso); return `${HG.fmtTime(d)}, ${dmy(d)}`; };
  const todayFluids = (Array.isArray(store('hg-fluids')[r.id]) ? store('hg-fluids')[r.id] : [])
    .filter(e => new Date(e.time).toDateString() === now.toDateString() && Number(e.ml) > 0);
  const todayMl = todayFluids.reduce((t, e) => t + Number(e.ml), 0);
  const notes = Array.isArray(store('hg-notes')[r.id]) ? store('hg-notes')[r.id] : [];
  const lastNote = notes.length ? notes[notes.length - 1] : null;
  const ack = store('hg-acks')[r.id] || null;

  document.title = `Health report, ${r.name} – HydroGuard`;
  HG.mountHeader({ context: 'Resident health report' });

  // ---------- Auto-written summary ----------
  function change(key, noun) {
    const a = first[key], b = latest[key];
    const steady = { temp: 0.2, hr: 3, hyd: 3 }[key];
    if (Math.abs(b - a) < steady) return `${noun} has stayed steady at about ${withUnit(key, b)}`;
    return `${noun} has ${b > a ? 'risen' : 'fallen'} from ${withUnit(key, a)} to ${withUnit(key, b)}`;
  }
  function writeSummary() {
    const hrs = Math.round((latest.time - first.time) / 3600e3);
    const s = [];
    s.push(`${r.preferred}’s ${change('temp', 'temperature')} over ${hrs} hours.`);
    s.push(`${cap(P.pos)} ${change('hr', 'heart rate')}, and ${P.pos} ${change('hyd', 'hydration index')}.`);
    const fl = r.fluids[6];
    const nb = r.nightBathroom;
    let fluids = `Yesterday ${P.sub} drank ${num(fl)} mL against a ${num(r.fluidTarget)} mL target`;
    if (nb[6] - nb[0] >= 2) fluids += `, and got up ${nb[6]} times in the night (${nb[0]} a week ago)`;
    else fluids += `, with ${nb[6]} bathroom ${nb[6] === 1 ? 'visit' : 'visits'} overnight`;
    s.push(fluids + '.');
    s.push(`The latest HydroGuard score is ${risk.total} of 9 (${HG.LEVELS[risk.level].label.toLowerCase()}).`);
    const uti = r.conditions.some(c => /UTI/.test(c));
    if (risk.level === 'high' && uti) s.push(`With ${P.pos} history of UTIs, review now for signs of UTI and let the RN in charge know.`);
    else s.push(HG.LEVELS[risk.level].advice);
    if (r.allergies.length && risk.level !== 'low') s.push(`Allergic to ${r.allergies.join(', ').toLowerCase()}: check before any new medicine is charted.`);
    return s.join(' ');
  }

  // ---------- Pieces ----------
  const scoreRows = KEYS.map(k => {
    const rule = HG.RULES[k], pts = risk.parts[k];
    return `<tr><td>${rule.label}</td><td class="num">${withUnit(k, latest[k])}</td><td class="muted">${HG.RULES[k].bands[3].text}${k === 'hyd' ? '' : ` ${rule.unit}`}</td><td class="num s${pts}">${pts}</td></tr>`;
  }).join('');

  const dayOf = i => { const d = new Date(HG.LATEST_TIME); d.setDate(d.getDate() - (7 - i)); return d; };
  const weekRows = r.fluids.map((ml, i) => {
    const pct = Math.round(ml / r.fluidTarget * 100);
    const n = r.nightBathroom[i];
    return `<tr><td>${HG.fmtDay(dayOf(i))}</td><td class="num">${num(ml)}</td><td class="num${pct < 70 ? ' s3' : pct < 90 ? ' s1' : ''}">${pct}%</td><td class="num${n >= 5 ? ' s3' : n >= 3 ? ' s1' : ''}">${n}</td></tr>`;
  }).join('');

  const events = r.events.map(e => {
    const today = e.time.toDateString() === now.toDateString();
    return `<li><span class="rp-ev-time">${today ? '' : 'Yesterday '}${HG.fmtTime(e.time)}</span><span>${esc(e.text)}</span></li>`;
  }).join('');

  const contactRows = r.contacts.map(c => {
    const roles = [c.primary && 'Primary', c.emergency && 'Emergency', c.poa && 'Enduring guardian / power of attorney'].filter(Boolean).join(', ');
    return `<tr><td>${esc(c.name)}</td><td>${esc(c.relation)}</td><td class="nowrap">${esc(c.phone)}</td><td class="muted">${esc(roles)}</td></tr>`;
  }).join('');
  const gpMissing = !r.contacts.some(c => c.relation === 'GP');

  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="rp-toolbar no-print">
      <button class="btn" type="button" id="print">${HG.icon.print}Print or save as PDF</button>
      <a class="btn secondary" href="resident.html?id=${encodeURIComponent(r.id)}">${HG.icon.back}Back to ${esc(r.preferred)}’s profile</a>
    </div>
    ${missing ? `<p class="rp-note small no-print">${reqId ? `No resident matches “${esc(reqId)}”` : 'No resident was given in the link'}, so this shows ${esc(r.preferred)} as an example.</p>` : ''}

    <article class="rp-page" aria-labelledby="rp-title">
      <header class="rp-head">
        <div>
          <h1 id="rp-title">Resident health report</h1>
          <p class="small muted">${esc(HG.FACILITY.full)}</p>
        </div>
        <p class="small rp-prep">Prepared for ${esc(preparedBy.name)} ${esc(preparedBy.short)}<br>${dmy(now)}, ${HG.fmtTime(now)}</p>
      </header>

      <section class="rp-id">
        ${HG.avatar(r, 'lg')}
        <div class="rp-who">
          <h2>${esc(r.name)} <span class="rp-pref">(${esc(r.preferred)})</span></h2>
          <dl class="rp-meta">
            <div><dt>Born</dt><dd>${esc(r.dob)} (${r.age})</dd></div>
            <div><dt>Room</dt><dd>${esc(r.room)}, ${esc(r.wing)} wing</dd></div>
            <div><dt>Resident ID</dt><dd>${esc(r.residentId)}</dd></div>
            <div><dt>Wristband</dt><dd>${esc(r.band)}</dd></div>
          </dl>
        </div>
        <div class="rp-flags">
          <div class="rp-flag"><span class="k">Resuscitation</span><strong>${esc(r.resus.status)}</strong><span class="d">${esc(r.resus.detail)}</span></div>
          <div class="rp-flag${r.allergies.length ? ' allergy' : ''}"><span class="k">Allergies</span><strong>${r.allergies.length ? r.allergies.map(esc).join(', ') : 'No known allergies'}</strong></div>
        </div>
      </section>

      <section class="rp-summary">
        <h2>Summary</h2>
        <p>${esc(writeSummary())}</p>
        ${ack && ack.time ? `<p class="small rp-ward"><strong>Alert acknowledged</strong> by ${esc(ack.by || 'staff')}, ${esc(stamp(ack.time))}.</p>` : ''}
        ${lastNote && lastNote.text ? `<p class="small rp-ward"><strong>Latest handover note</strong> (${esc(lastNote.by || 'staff')}, ${esc(stamp(lastNote.time))}): ${esc(lastNote.text)}</p>` : ''}
        <p class="small muted">Conditions: ${r.conditions.map(esc).join('; ')}. Mobility: ${esc(r.mobility)}. Diet: ${esc(r.diet)}.</p>
      </section>

      <div class="rp-cols">
        <section>
          <h2>Latest reading, ${HG.fmtTime(latest.time)} ${dmy(latest.time)}</h2>
          <table class="table rp-table">
            <thead><tr><th scope="col">Measure</th><th scope="col" class="num">Reading</th><th scope="col">Normal range</th><th scope="col" class="num">Points</th></tr></thead>
            <tbody>${scoreRows}</tbody>
            <tfoot><tr><th scope="row" colspan="3">Total (out of 9)</th><td class="num rp-total">${risk.total}</td></tr></tfoot>
          </table>
          <p class="rp-level">${HG.riskChip(risk.level)} <span class="small">${esc(HG.LEVELS[risk.level].advice)}</span></p>
          <p class="xs muted">Each measure scores 0 to 3. High risk: total 5 or more, or any measure scoring 3. Watch: total 2 to 4, or any measure scoring 2.</p>
        </section>
        <section>
          <h2>Last 7 days</h2>
          <table class="table rp-table">
            <thead><tr><th scope="col">Day</th><th scope="col" class="num">Fluids (mL)</th><th scope="col" class="num">Of target</th><th scope="col" class="num">Night visits</th></tr></thead>
            <tbody>${weekRows}</tbody>
            <tfoot><tr><th scope="row">Today so far</th><td class="num">${num(todayMl)}</td><td class="num">${Math.round(todayMl / r.fluidTarget * 100)}%</td><td class="num muted">–</td></tr></tfoot>
          </table>
          <p class="xs muted">${todayFluids.length ? `Today: ${todayFluids.length} ${todayFluids.length === 1 ? 'drink' : 'drinks'} logged by staff, last at ${HG.fmtTime(new Date(todayFluids[todayFluids.length - 1].time))}.` : 'No drinks logged by staff yet today.'}</p>
          <p class="xs muted">Fluid target ${num(r.fluidTarget)} mL a day. Night visits are overnight bathroom trips; a rise can be an early sign of a UTI.</p>
        </section>
      </div>

      <section class="rp-charts">
        <h2>Last 24 hours</h2>
        <div class="rp-chart-grid">
          ${KEYS.map(k => `<figure><figcaption>${HG.RULES[k].label} <span class="muted">(${HG.RULES[k].unit})</span></figcaption><div class="rp-chart" data-key="${k}"></div></figure>`).join('')}
        </div>
        <p class="xs muted">Shaded band is the normal range. Coloured dots are readings that scored points.</p>
      </section>

      <div class="rp-cols">
        <section>
          <h2>Recent events</h2>
          <ol class="ruled rp-events">${events}</ol>
        </section>
        <section>
          <h2>Contacts</h2>
          <table class="table rp-table rp-contacts">
            <thead><tr><th scope="col">Name</th><th scope="col">Relationship</th><th scope="col">Phone</th><th scope="col">Role</th></tr></thead>
            <tbody>${contactRows}${gpMissing ? '<tr><td colspan="4" class="muted">GP not recorded</td></tr>' : ''}</tbody>
          </table>
        </section>
      </div>
    </article>`;

  HG.$$('.rp-chart').forEach(el => {
    const k = el.dataset.key;
    HG.chart(el, { points: r.readings.map(p => ({ time: p.time, value: p[k] })), key: k, xFormat: 'time', height: 120, scores: true });
  });

  HG.$('#print').addEventListener('click', () => window.print());
  HG.demoNote('Generated by HydroGuard from wristband readings. Check against the resident’s clinical record.');
})(window.HG);
