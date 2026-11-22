// حماية: HTTPS دائماً، ومنع العرض داخل إطار موقع تاني
(function () {
  if (location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') { location.replace('https://' + location.host + location.pathname + location.search + location.hash); return; }
  if (window.top !== window.self) { try { window.top.location = window.self.location.href; } catch (e) { document.documentElement.style.display = 'none'; } }
})();
// شاشة البداية: السراج بيضوي، مع نغمة هادية
(function () {
  var el = document.getElementById('intro');
  var seen = false; try { seen = sessionStorage.getItem('siraj_intro') === '1'; sessionStorage.setItem('siraj_intro', '1'); } catch (e) {}
  try { if (localStorage.getItem('siraj.theme') === 'dark') document.body.classList.replace('t-light', 't-dark'); } catch (e) {}
  if (seen) { el.remove(); return; }
  document.documentElement.classList.add('intro-on');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, ac = null, played = false;
  function chime() {
    if (played) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      if (ac.state !== 'running') return;
      played = true;
      var now = ac.currentTime + 0.05, master = ac.createGain(), lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2600; master.gain.value = 0.14; lp.connect(master); master.connect(ac.destination);
      [[523.25, 0], [659.25, 0.4], [783.99, 0.8], [1046.5, 1.2]].forEach(function (n) {
        [1, 2.01].forEach(function (mult, i) {
          var o = ac.createOscillator(), g = ac.createGain(), st = now + n[1];
          o.type = 'sine'; o.frequency.value = n[0] * mult;
          g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(i ? 0.1 : 0.45, st + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, st + (i ? 0.7 : 2.2));
          o.connect(g); g.connect(lp); o.start(st); o.stop(st + 2.4);
        });
      });
    } catch (e) {}
  }
  chime();
  requestAnimationFrame(function () { el.classList.add('go'); });
  var t = setTimeout(done, reduce ? 900 : 2800);
  function done() { clearTimeout(t); el.classList.add('out'); document.documentElement.classList.remove('intro-on'); setTimeout(function () { if (el.parentNode) el.remove(); }, 700); }
  el.addEventListener('pointerdown', function () { chime(); clearTimeout(t); t = setTimeout(done, 900); }, { once: true });
})();
