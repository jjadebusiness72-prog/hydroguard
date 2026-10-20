/* Demo hub (index.html): what HydroGuard is, plus a link to every view, grouped by who uses it. */
(function () {
  const { esc, icon } = HG;
  const $ = s => document.querySelector(s);

  HG.mountHeader({ context: `${HG.FACILITY.name} demo` });

  // Fill decorative icons
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon[el.dataset.icon] || ''; });

  const residents = HG.RESIDENTS.slice().sort((a, b) =>
    HG.LEVELS[a.risk.level].rank - HG.LEVELS[b.risk.level].rank || b.risk.total - a.risk.total);
  const lastName = r => r.name.split(' ').slice(1).join(' ');
  const shortName = r => `${r.preferred} ${lastName(r)}`;
  const possessive = n => `${n}’s`;
  const tone = s => (s >= 2 ? 'high' : s === 1 ? 'watch' : 'low');

  // ---------- Live wristband reading for the highest-risk resident ----------
  const top = residents[0];
  const latest = top.readings[top.readings.length - 1];
  const rows = [
    { key: 'temp', icon: 'thermo' },
    { key: 'hr', icon: 'heart' },
    { key: 'hyd', icon: 'drop' },
  ].map(({ key, icon: ic }) => {
    const rule = HG.RULES[key];
    const sc = top.risk.parts[key];
    return `
      <div class="callout live-row">
        <span class="label">${icon[ic]}${rule.label}</span>
        <span class="line ${tone(sc)}" aria-hidden="true"></span>
        <span class="reading">${HG.fmtValue(key, latest[key])}<span class="unit">${rule.unit}</span></span>
      </div>`;
  }).join('');

  $('#live').innerHTML = `
    <article class="block live" aria-label="Latest wristband reading for ${esc(shortName(top))}">
      <div class="live-band">
        <span class="live-id">${icon.nfc}<span>Band ${esc(top.band)}</span></span>
        <span class="live-time">Read at ${HG.fmtTime(latest.time)}</span>
      </div>
      <div class="live-who">
        ${HG.avatar(top, 'lg')}
        <div>
          <h2 class="live-name">${esc(shortName(top))}</h2>
          <p class="live-meta">Room ${esc(top.room)}, ${esc(top.wing)} wing. Now in the ${esc(HG.ZONES[top.location].label.toLowerCase())}.</p>
          <span class="chip ${top.risk.level}">${HG.LEVELS[top.risk.level].label}, score ${top.risk.total} of 9</span>
        </div>
      </div>
      <div class="live-rows">${rows}</div>
      <p class="live-advice">${esc(HG.LEVELS[top.risk.level].advice)}</p>
      <div class="live-actions">
        <a class="btn" href="resident.html?id=${top.id}">Open ${esc(possessive(top.preferred))} profile</a>
        <a class="btn secondary" href="nurse.html?id=${top.id}">See it on the ward</a>
      </div>
    </article>`;

  // ---------- Residents ----------
  $('#res-grid').innerHTML = residents.map(r => `
    <li>
      <a class="res-link" href="resident.html?id=${r.id}">
        ${HG.avatar(r)}
        <span class="res-text">
          <span class="res-name">${esc(r.preferred)}</span>
          <span class="res-sub">${esc(r.name)}, room ${esc(r.room)}</span>
        </span>
        ${HG.riskChip(r.risk.level)}
      </a>
    </li>`).join('');

  // ---------- Doors (a few rooms, highest risk first so the story flows) ----------
  const doorPeople = ['margaret', 'ravi', 'bill', 'kev'].map(HG.resident).filter(Boolean);
  $('#door-list').innerHTML = doorPeople.map(r => `
    <li>
      <a class="link-row" href="door.html?room=${encodeURIComponent(r.room)}">
        <span class="link-icon lilac">${icon.key}</span>
        <span class="link-text"><span class="link-title">Room ${esc(r.room)} door</span>
        <span class="link-sub">${esc(possessive(r.preferred))} room, ${esc(r.wing)} wing</span></span>
      </a>
    </li>`).join('');

  // ---------- Staff ----------
  const S = HG.STAFF;
  const staff = [
    { href: 'nurse.html', person: S.priya, title: 'Ward dashboard', sub: `${S.priya.name}, ${S.priya.short}. Residents by risk, alerts, fluids and handover notes.` },
    { href: 'manager.html', person: S.leanne, title: 'Facility dashboard', sub: `${S.leanne.name}, ${S.leanne.short}. Trends across both wings, devices and staff.` },
    { href: 'manager.html#map', iconName: 'map', title: 'Where everyone is', sub: 'Live floor plan of the home from the wristbands.' },
  ];
  $('#staff-list').innerHTML = staff.map(s => `
    <li>
      <a class="link-row" href="${s.href}">
        ${s.person ? HG.avatar(s.person) : `<span class="link-icon">${icon[s.iconName]}</span>`}
        <span class="link-text"><span class="link-title">${esc(s.title)}</span>
        <span class="link-sub">${esc(s.sub)}</span></span>
      </a>
    </li>`).join('');

  // ---------- Reports ----------
  const reportPeople = residents.slice(0, 3);
  $('#report-list').innerHTML = reportPeople.map((r, i) => `
    <li>
      <a class="link-row" href="report.html?id=${r.id}">
        <span class="link-icon">${icon.doc}</span>
        <span class="link-text"><span class="link-title">${esc(possessive(shortName(r)))} health report</span>
        <span class="link-sub">${i === 0 ? '30-day trends, fluids and night-time bathroom visits.' : `${HG.LEVELS[r.risk.level].label}, room ${esc(r.room)}`}</span></span>
      </a>
    </li>`).join('');

  HG.demoNote();
})();
