/* HydroGuard shared UI helpers. Load order on every page:
   scoring.js → data.js → ui.js → <page>.js */
(function (HG) {
  // ---------- Theme (set before paint to avoid a flash) ----------
  const THEME_KEY = 'hg-theme';
  function storedTheme() { try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; } }
  function applyTheme(t) {
    const theme = t || storedTheme() || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  }
  applyTheme();
  HG.toggleTheme = function () {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyTheme(next);
    document.dispatchEvent(new CustomEvent('hg:theme', { detail: next }));
  };

  // ---------- Small utilities ----------
  HG.$ = (s, el = document) => el.querySelector(s);
  HG.$$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  HG.param = name => new URLSearchParams(location.search).get(name);
  HG.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  HG.h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  const AU = 'en-AU';
  HG.fmtTime = d => d.toLocaleTimeString(AU, { hour: 'numeric', minute: '2-digit' }).replace(' ', ' ');
  HG.fmtDate = d => d.toLocaleDateString(AU, { day: 'numeric', month: 'short' });
  HG.fmtDay = d => d.toLocaleDateString(AU, { weekday: 'short', day: 'numeric', month: 'short' });
  HG.fmtAgo = d => {
    const m = Math.round((Date.now() - d.getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    return h < 24 ? `${h} hr ago` : `${Math.round(h / 24)} days ago`;
  };
  HG.fmtValue = (key, v) => key === 'temp' ? v.toFixed(1) : String(Math.round(v));

  // ---------- Icons (inline SVG, 24px grid, 1.6 stroke) ----------
  const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  HG.icon = {
    sun: I('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    moon: I('<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>'),
    home: I('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
    key: I('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>'),
    chart: I('<path d="M3 20h18"/><path d="M5 16l4-5 4 3 6-8"/>'),
    people: I('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.6 3.5 5.2"/>'),
    map: I('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>'),
    doc: I('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'),
    phone: I('<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>'),
    bell: I('<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
    drop: I('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
    heart: I('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
    thermo: I('<path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M12 10v6"/>'),
    check: I('<path d="M5 12.5l4.5 4.5L19 7"/>'),
    close: I('<path d="M6 6l12 12M18 6L6 18"/>'),
    back: I('<path d="M15 5l-7 7 7 7"/>'),
    print: I('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>'),
    nfc: I('<path d="M8 8a6 6 0 0 1 0 8M11 5.5a10 10 0 0 1 0 13M5 10.5a2.5 2.5 0 0 1 0 3"/><path d="M15 5.5a10 10 0 0 1 0 13" opacity=".5"/>'),
    lock: I('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    unlock: I('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>'),
    pin: I('<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>'),
  };

  // ---------- Header + tabs ----------
  // HG.mountHeader({ context: 'Banksia wing', tabs: [{ href, label, icon, current }] })
  HG.mountHeader = function ({ context = '', tabs = [] } = {}) {
    const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
    const header = HG.h(`
      <header class="hg-header">
        <div class="wrap">
          <a class="hg-logo" href="index.html" aria-label="HydroGuard demo home">
            <span class="mark" aria-hidden="true">h</span><span class="word">hydroguard</span>
          </a>
          ${context ? `<span class="context">${HG.esc(context)}</span>` : ''}
          <span class="spacer"></span>
          <nav class="hg-tabs" aria-label="Sections"></nav>
          <button class="icon-btn" type="button" data-theme-toggle aria-label="Switch light or dark mode"></button>
        </div>
      </header>`);
    const nav = header.querySelector('.hg-tabs');
    if (tabs.length) {
      document.body.classList.add('has-tabs');
      tabs.forEach(t => nav.appendChild(HG.h(`<a href="${t.href}" ${t.current ? 'aria-current="page"' : ''}>${HG.icon[t.icon] || ''}<span>${HG.esc(t.label)}</span></a>`)));
    } else nav.remove();
    const btn = header.querySelector('[data-theme-toggle]');
    const paint = () => { btn.innerHTML = isDark() ? HG.icon.sun : HG.icon.moon; };
    paint();
    btn.addEventListener('click', () => { HG.toggleTheme(); paint(); });
    document.body.prepend(header);
    return header;
  };

  // ---------- Avatar with initials fallback ----------
  HG.initials = name => name.replace(/[’']/g, '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  HG.avatar = function (person, cls = '') {
    const ring = person.risk ? ` ring-${person.risk.level}` : '';
    // initials sit underneath; the photo covers them once loaded and removes itself if missing
    return `<span class="avatar ${cls}${ring}"><span aria-hidden="true">${HG.initials(person.name)}</span>` +
      `<img src="${person.photo}" alt="" onerror="this.remove()"></span>`;
  };

  // ---------- Chips ----------
  HG.riskChip = level => `<span class="chip ${level}">${HG.LEVELS[level].label}</span>`;

  // ---------- Toast ----------
  let toastEl, toastTimer;
  HG.toast = function (msg) {
    if (!toastEl) { toastEl = HG.h('<div class="hg-toast" role="status" aria-live="polite"></div>'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  };

  // ---------- Bottom sheet ----------
  // HG.sheet(contentEl) → { open(), close(), el }
  HG.sheet = function (content) {
    const back = HG.h('<div class="sheet-backdrop"></div>');
    const el = HG.h('<div class="sheet" role="dialog" aria-modal="true" tabindex="-1"><div class="grab"></div></div>');
    el.appendChild(content);
    document.body.append(back, el);
    const api = {
      el,
      open() { back.classList.add('open'); el.classList.add('open'); el.focus?.(); },
      close() { back.classList.remove('open'); el.classList.remove('open'); },
    };
    back.addEventListener('click', api.close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') api.close(); });
    return api;
  };

  // ---------- Line chart with normal-range band ----------
  // HG.chart(el, { points: [{ time: Date, value: Number }], key: 'temp'|'hr'|'hyd',
  //                xFormat: 'time'|'date', height: 160, scores: true })
  // Re-renders on resize and theme change. Returns { update(points) }.
  HG.chart = function (el, opts) {
    let points = opts.points;
    const rule = HG.RULES[opts.key];
    const H = opts.height || 160;
    const pad = { t: 12, r: 52, b: 22, l: 30 };

    function render() {
      const W = Math.max(260, el.clientWidth || 320);
      const vals = points.map(p => p.value);
      let lo = Math.min(...vals, rule.normal[0]);
      let hi = Math.max(...vals, Math.min(rule.normal[1], Math.max(...vals) + (rule.step < 1 ? 1 : 10)));
      const span = hi - lo || 1; lo -= span * 0.12; hi += span * 0.12;
      const x = i => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
      const y = v => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
      const bandTop = y(Math.min(rule.normal[1], hi)), bandBot = y(Math.max(rule.normal[0], lo));

      const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15];
      const dp = rule.step < 1 ? 1 : 0;
      const fmtX = opts.xFormat === 'date' ? HG.fmtDate : HG.fmtTime;
      const every = Math.ceil(points.length / 4);

      let s = `<svg class="hg-chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${rule.label} trend">`;
      s += `<rect class="band" x="${pad.l}" y="${bandTop}" width="${W - pad.l - pad.r}" height="${Math.max(0, bandBot - bandTop)}" rx="3"/>`;
      ticks.forEach(t => { s += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${pad.l - 6}" y="${y(t) + 3}" text-anchor="end">${t.toFixed(dp)}</text>`; });
      points.forEach((p, i) => { if (i % every === 0 && i < points.length - 1) s += `<text class="axis" x="${x(i)}" y="${H - 6}" text-anchor="middle">${fmtX(p.time)}</text>`; });
      s += `<path class="line" d="${points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('')}"/>`;
      points.forEach((p, i) => {
        const sc = opts.scores ? HG.scoreOne(opts.key, p.value) : 0;
        const last = i === points.length - 1;
        if (opts.scores || last) s += `<circle class="dot s${sc}${last ? ' last' : ''}" cx="${x(i)}" cy="${y(p.value)}" r="${last ? 4 : 2.6}"><title>${fmtX(p.time)}: ${HG.fmtValue(opts.key, p.value)} ${rule.unit}</title></circle>`;
      });
      // dot-and-hairline callout to the latest value
      const lx = x(points.length - 1), ly = y(points[points.length - 1].value);
      s += `<line class="leader" x1="${lx + 6}" x2="${W - pad.r + 8}" y1="${ly}" y2="${ly}"/>`;
      s += `<text class="val" x="${W - pad.r + 10}" y="${ly + 5}">${HG.fmtValue(opts.key, points[points.length - 1].value)}</text>`;
      s += '</svg>';
      el.innerHTML = s;
    }
    render();
    // one observer + theme listener per element: re-charting the same element replaces the old ones
    if (el._hgChartCleanup) el._hgChartCleanup();
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => render()) : null;
    if (ro) ro.observe(el);
    document.addEventListener('hg:theme', render);
    el._hgChartCleanup = () => { if (ro) ro.disconnect(); document.removeEventListener('hg:theme', render); };
    return { update(p) { points = p; render(); } };
  };

  // ---------- Demo footer ----------
  HG.demoNote = function (extra = '') {
    const n = HG.h(`<footer class="wrap"><p class="demo-note">Demo only. All residents, staff and readings are made up. The risk score has not been clinically validated and must not be used for care decisions. ${extra}</p></footer>`);
    document.body.appendChild(n);
  };
})(window.HG = window.HG || {});
