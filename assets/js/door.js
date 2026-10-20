/* Door reader — door.html?room=<room>&id=<id>
   Simulates tapping a wristband on the room's door reader.
   Access log persists in localStorage under hg-door-<room>. */
(function (HG) {
  const esc = HG.esc;
  const RELOCK_S = 10;
  const READ_MS = 1200;

  // ---------- Find the resident: room first, then id, then Margaret ----------
  const qRoom = HG.param('room');
  const qId = HG.param('id');
  let r = (qRoom && HG.RESIDENTS.find(x => x.room === qRoom)) || (qId && HG.resident(qId)) || null;
  const missing = !r;
  if (!r) r = HG.resident('margaret');
  const room = r.room;
  // A wristband that belongs to someone else, for the refused demo
  const other = HG.RESIDENTS[(HG.RESIDENTS.indexOf(r) + 1) % HG.RESIDENTS.length];

  document.title = `Room ${room} door – HydroGuard`;
  HG.mountHeader({ context: `Door reader, room ${room}` });

  // ---------- Access log ----------
  const LOG_KEY = `hg-door-${room}`;
  function loadLog() {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      if (raw) return JSON.parse(raw).map(e => ({ ...e, t: new Date(e.t) }));
    } catch (e) { /* storage unavailable */ }
    // First visit: seed from the wristband's recent door events
    return r.events.filter(e => /door unlocked/i.test(e.text)).map(e => ({ t: e.time, ok: true, band: r.band }));
  }
  let log = loadLog();
  function saveLog() {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 30))); } catch (e) { /* ignore */ }
  }
  function addLog(ok, band) {
    log.unshift({ t: new Date(), ok, band });
    log = log.slice(0, 30);
    saveLog();
    renderLog();
  }

  // ---------- Markup ----------
  const note = missing ? `<p class="door-note small">${qRoom
    ? `No room ${esc(qRoom)} is set up in this demo, so this shows room ${esc(room)}.`
    : `No room was given in the link, so this shows room ${esc(room)}.`}</p>` : '';

  document.getElementById('main').innerHTML = `
    ${note}
    <section class="block door-reader" data-state="reading" aria-labelledby="door-room">
      <div class="door-top">
        <div>
          <p class="door-room-label">Room</p>
          <p class="door-room serif" id="door-room">${esc(room)}</p>
          <p class="door-wing">${esc(r.wing)} wing</p>
        </div>
        <span class="door-icon" aria-hidden="true">${HG.icon.nfc}</span>
      </div>
      <p class="door-status" id="door-status" role="status" aria-live="polite">Reading wristband…</p>
      <p class="door-sub" id="door-sub">Hold the wristband still on the reader</p>
    </section>

    <div class="door-who">
      ${HG.avatar(r, 'lg')}
      <div>
        <p class="door-name">${esc(r.preferred)} <span class="muted">(${esc(r.name)})</span></p>
        <p class="small muted">Wristband ${esc(r.band)}</p>
        <a class="small" href="resident.html?id=${encodeURIComponent(r.id)}">View ${esc(r.preferred)}’s profile</a>
      </div>
    </div>

    <div class="door-actions">
      <button class="btn" type="button" id="again">${HG.icon.unlock}Unlock again</button>
      <button class="btn secondary" type="button" id="wrong">${HG.icon.nfc}Try with a different wristband</button>
    </div>

    <section class="section door-log-sec" aria-labelledby="log-h">
      <div class="section-head"><h2 id="log-h">Access log</h2><button class="btn ghost" type="button" id="clear">Clear log</button></div>
      <ol class="ruled door-log" id="door-log"></ol>
    </section>`;

  const reader = HG.$('.door-reader');
  const icon = HG.$('.door-icon');
  const status = HG.$('#door-status');
  const sub = HG.$('#door-sub');
  const btnAgain = HG.$('#again');
  const btnWrong = HG.$('#wrong');

  function renderLog() {
    const el = HG.$('#door-log');
    if (!log.length) { el.innerHTML = '<li class="muted small">No taps yet.</li>'; return; }
    const today = new Date().toDateString();
    el.innerHTML = log.map(e => {
      const t = e.t.toDateString() === today ? HG.fmtTime(e.t) : `${HG.fmtDate(e.t)} ${HG.fmtTime(e.t)}`;
      const what = e.ok
        ? `<span class="chip low">Unlocked</span><span>${esc(r.preferred)}’s wristband (${esc(e.band)})</span>`
        : `<span class="chip high">Refused</span><span>Wristband ${esc(e.band)} is not set up for room ${esc(room)}</span>`;
      return `<li><span class="log-time">${t}</span><span class="log-what">${what}</span></li>`;
    }).join('');
  }

  // ---------- The orchestrated moment ----------
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  function setState(state) {
    reader.dataset.state = state;
    const ic = { reading: 'nfc', unlocked: 'unlock', locked: 'lock', refused: 'lock' }[state];
    icon.innerHTML = HG.icon[ic];
    icon.classList.remove('pop');
    void icon.offsetWidth; // restart the pop animation
    if (state !== 'reading') icon.classList.add('pop');
  }

  function busy(on) { btnAgain.disabled = on; btnWrong.disabled = on; }

  function tap(own) {
    clearTimers();
    busy(true);
    setState('reading');
    status.textContent = 'Reading wristband…';
    sub.textContent = 'Hold the wristband still on the reader';
    later(() => {
      busy(false);
      if (own) unlock(); else refuse();
    }, READ_MS);
  }

  function unlock() {
    setState('unlocked');
    status.textContent = 'Door unlocked';
    addLog(true, r.band);
    let left = RELOCK_S;
    const paint = () => { sub.textContent = `Relocks in ${left} ${left === 1 ? 'second' : 'seconds'}`; };
    paint();
    const step = () => {
      left -= 1;
      if (left <= 0) return lock();
      paint();
      later(step, 1000);
    };
    later(step, 1000);
  }

  function lock() {
    setState('locked');
    status.textContent = 'Locked';
    sub.textContent = `Tap ${r.preferred}’s wristband to open`;
  }

  function refuse() {
    setState('refused');
    status.textContent = `This wristband can’t open room ${room}`;
    sub.textContent = `Wristband ${other.band} is not set up for this door. Attempt logged.`;
    addLog(false, other.band);
    later(lock, 5000);
  }

  btnAgain.addEventListener('click', () => tap(true));
  btnWrong.addEventListener('click', () => tap(false));
  HG.$('#clear').addEventListener('click', () => {
    log = [];
    saveLog();
    renderLog();
    HG.toast('Access log cleared');
  });

  renderLog();
  tap(true); // the page opening is the tap

  HG.demoNote('The door reader is simulated: no real lock is opened.');
})(window.HG);
