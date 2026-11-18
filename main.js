(() => {
  const LIVE_MAX = 300;
  const REGIMES = [
    {id:'creeping', name:'Creeping flow', lo:1, hi:5, jump:2, text:'Viscosity dominates. Streamlines close symmetrically behind the cylinder with no separation.'},
    {id:'steady', name:'Steady separated flow', lo:5, hi:47, jump:30, text:'Flow separates and a pair of steady, counter-rotating eddies grows with Re. The wake is still symmetric.'},
    {id:'street', name:'Laminar vortex street', lo:47, hi:190, jump:100, text:'Near Re ≈ 47 the steady wake becomes unstable (a Hopf bifurcation) and vortices shed alternately, giving St ≈ 0.12 to 0.19.'},
    {id:'wake3d', name:'Three-dimensional wake transition', lo:190, hi:300, jump:250, text:'Spanwise instabilities (modes A and B) appear and the wake becomes three-dimensional. A 2D simulation cannot capture this, so the live view is only qualitative here.'},
    {id:'subcritical', name:'Subcritical', lo:300, hi:3e5, jump:3e4, video:'subcritical', text:'The boundary layer stays laminar and separates near 80° from the front stagnation point. The wake is turbulent with strong periodic shedding, St ≈ 0.2 and Cd ≈ 1.2.'},
    {id:'critical', name:'Critical and drag crisis', lo:3e5, hi:3.5e6, jump:5e5, video:'critical', text:'The boundary layer becomes turbulent before separating, so separation moves downstream. The wake narrows and Cd drops sharply to about 0.3. Shedding is irregular.'},
    {id:'postcritical', name:'Post-critical', lo:3.5e6, hi:1e7, jump:5e6, video:'postcritical', text:'The boundary layer is turbulent over the front of the cylinder. Cd recovers to about 0.6 to 0.7 and regular shedding returns with St ≈ 0.27.'}
  ];
  const $ = id => document.getElementById(id);
  const fmt = r => r < 1000 ? (r < 10 ? r.toFixed(1) : Math.round(r)) : r.toExponential(1).replace('e+', '×10^').replace(/\^(\d+)/, (_, n) => [...n].map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join(''));
  const dark = () => matchMedia('(prefers-color-scheme: dark)').matches;
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const slider = $('slider'), cv = $('flow'), ctx = cv.getContext('2d'), overlay = $('overlay');
  const sim = new LBM(320, 128, 16, 0.12);
  const img = ctx.createImageData(sim.nx, sim.ny);
  let Re = 100, paused = false, live = true;

  // ----- regime cards
  const box = $('regimes');
  REGIMES.forEach(r => {
    const d = document.createElement('div'); d.className = 'regime'; d.id = 'r-' + r.id;
    d.innerHTML = `<h3>${r.name}</h3><div class="re">Re ≈ ${fmt(r.lo)} to ${fmt(r.hi)}</div><p>${r.text}</p>`;
    const b = document.createElement('button'); b.textContent = `Show Re = ${fmt(r.jump)}`;
    b.onclick = () => { slider.value = Math.round(Math.log10(r.jump) * 100); update(); $('sim').scrollIntoView({block:'nearest'}); };
    d.appendChild(b); box.appendChild(d);
  });

  // ----- interpolation on data
  function interp(a, x) {
    if (x < a[0][0] || x > a[a.length - 1][0]) return null;
    for (let i = 1; i < a.length; i++) if (x <= a[i][0]) {
      const t = Math.log(x / a[i - 1][0]) / Math.log(a[i][0] / a[i - 1][0]);
      return a[i - 1][1] + t * (a[i][1] - a[i - 1][1]);
    }
  }
  const stAt = x => { for (const s of CDST.st) { const v = interp(s, x); if (v != null) return v; } return null; };

  // ----- overlay for pre-computed regimes
  function showPre(reg) {
    const v = (window.VIDEOS || {})[reg.video];
    overlay.hidden = false;
    if (v && v.file) {
      overlay.innerHTML = `<video src="videos/${v.file}" autoplay loop muted playsinline></video>`;
    } else {
      overlay.innerHTML = `<strong>Pre-computed footage not added yet</strong><span>Add a clip for “${reg.name}” in videos/manifest.js. A live 2D simulation cannot resolve this regime.</span>`;
    }
  }

  // ----- main update
  let lastReg = null;
  function update() {
    Re = Math.pow(10, slider.value / 100);
    const reg = REGIMES.find(r => Re >= r.lo && Re < r.hi) || REGIMES[REGIMES.length - 1];
    $('reVal').textContent = fmt(Re); $('regimeName').textContent = reg.name;
    document.querySelectorAll('.regime').forEach(e => e.classList.toggle('active', e.id === 'r-' + reg.id));
    const cd = interp(CDST.cd, Re), st = stAt(Re);
    $('cdVal').textContent = cd == null ? '–' : cd.toFixed(2);
    $('stVal').textContent = st == null ? 'n/a' : st.toFixed(3);
    const wasLive = live; live = Re <= LIVE_MAX;
    const note = $('simNote');
    if (live) {
      overlay.hidden = true; sim.setRe(Re);
      if (!wasLive) sim.reset();
      note.className = 'note' + (Re >= 190 ? ' warn' : '');
      note.textContent = Re >= 190 ? 'Live 2D simulation. The real wake is three-dimensional above Re ≈ 190, which this 2D model cannot show.'
        : 'Live simulation. Cd and St above come from literature curves, not from this simulation.';
    } else {
      showPre(reg); note.className = 'note'; note.textContent = 'Pre-computed footage, not a live simulation.';
    }
    lastReg = reg; drawPlots();
  }

  // ----- render flow
  function render() {
    const { nx, ny, solid } = sim, d = img.data, dk = dark();
    const bg = dk ? [15, 22, 29] : [245, 247, 249], neg = dk ? [90, 170, 255] : [29, 95, 166], pos = dk ? [255, 140, 90] : [196, 60, 40];
    for (let y = 1; y < ny - 1; y++) for (let x = 1; x < nx - 1; x++) {
      const i = x + y * nx, o = i * 4;
      if (solid[i]) { d[o] = 80; d[o + 1] = 90; d[o + 2] = 100; d[o + 3] = 255; continue; }
      const w = Math.max(-1, Math.min(1, sim.vorticity(i) / 0.06)), a = Math.min(1, Math.abs(w) ** 0.8), c = w > 0 ? pos : neg;
      d[o] = bg[0] + (c[0] - bg[0]) * a; d[o + 1] = bg[1] + (c[1] - bg[1]) * a; d[o + 2] = bg[2] + (c[2] - bg[2]) * a; d[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  function frame() {
    if (live && !paused) {
      const t0 = performance.now(); let n = 0;
      while (n < 12 && performance.now() - t0 < 12) { sim.step(); n++; }
      if (!sim.ok) { sim.reset(); }
    }
    if (live) render();
    requestAnimationFrame(frame);
  }

  // ----- plots
  function drawPlot(c, data, opts) {
    const dpr = devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
    c.width = W * dpr; c.height = H * dpr;
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const m = {l: 44, r: 12, t: 12, b: 28}, X = r => m.l + (Math.log10(r) / 7) * (W - m.l - m.r), Y = v => H - m.b - (v - opts.y0) / (opts.y1 - opts.y0) * (H - m.t - m.b);
    const ink = css('--ink'), mut = css('--muted'), line = css('--line'), acc = css('--accent');
    g.font = '11px system-ui'; g.textAlign = 'center'; g.fillStyle = mut; g.strokeStyle = line; g.lineWidth = 1;
    for (let p = 0; p <= 7; p++) { g.beginPath(); g.moveTo(X(10 ** p), m.t); g.lineTo(X(10 ** p), H - m.b); g.stroke(); g.fillText('10' + '⁰¹²³⁴⁵⁶⁷'[p], X(10 ** p), H - 10); }
    g.textAlign = 'right';
    for (let v = opts.y0; v <= opts.y1 + 1e-9; v += opts.dy) { g.beginPath(); g.moveTo(m.l, Y(v)); g.lineTo(W - m.r, Y(v)); g.stroke(); g.fillText(v.toFixed(opts.dec), m.l - 6, Y(v) + 4); }
    g.fillStyle = ink; g.textAlign = 'left'; g.fillText(opts.label, m.l + 6, m.t + 12);
    g.strokeStyle = acc; g.lineWidth = 2;
    data.forEach(seg => { g.beginPath(); seg.forEach((p, i) => { const px = X(p[0]), py = Y(Math.min(p[1], opts.y1)); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke(); });
    g.strokeStyle = ink; g.lineWidth = 1; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(X(Re), m.t); g.lineTo(X(Re), H - m.b); g.stroke(); g.setLineDash([]);
  }
  function drawPlots() {
    drawPlot($('plotCd'), [CDST.cd], {y0: 0, y1: 3, dy: 1, dec: 0, label: 'Cd (curve clipped at 3 for Re < 10)'});
    drawPlot($('plotSt'), CDST.st, {y0: 0, y1: 0.3, dy: 0.1, dec: 1, label: 'St (undefined in the critical range)'});
  }

  // ----- controls and credits
  slider.addEventListener('input', update);
  $('pause').onclick = e => { paused = !paused; e.target.textContent = paused ? 'Resume' : 'Pause'; };
  $('reset').onclick = () => sim.reset();
  addEventListener('resize', drawPlots);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawPlots);
  const cr = Object.entries(window.VIDEOS || {}).filter(([, v]) => v.file);
  if (cr.length) $('credits').innerHTML = 'Video credits: ' + cr.map(([, v]) => `${v.author}, <a href="${v.source}">${v.license}</a>`).join('; ');
  if (window.renderMathInElement) renderMathInElement(document.body, {delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}], ignoredTags: ['script', 'style', 'textarea', 'pre', 'code', 'canvas']});
  update(); requestAnimationFrame(frame);
})();
