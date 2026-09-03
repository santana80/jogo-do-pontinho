(() => {
  const splash = document.getElementById('smsSplash');
  if (!splash) return;

  let ended = false;
  let audioLogo = null;

  function finish() {
    if (ended) return;
    ended = true;
    if (audioLogo) {
      const fade = setInterval(() => {
        audioLogo.volume = Math.max(0, audioLogo.volume - 0.08);
        if (audioLogo.volume <= 0.02) { clearInterval(fade); audioLogo.pause(); }
      }, 35);
    }
    splash.classList.add('sms-splash-out');
    setTimeout(() => splash.remove(), 760);
  }

  function tentarAudioLogo() {
    try {
      if (window.SMSAudio?.isMuted?.()) return;
      audioLogo = new Audio('sons/sms-studio-cinematografica.wav?v=426');
      const vol = Math.max(0, Math.min(1, (window.SMSAudio?.getVolume?.() ?? 80) / 100));
      audioLogo.volume = Math.min(1, vol * 0.95);
      audioLogo.play().catch(() => {}); // autoplay pode ser bloqueado pelo navegador
    } catch (_) {}
  }

  // A abertura começa imediatamente, sem tela intermediária.
  splash.classList.add('sms-splash-play');
  tentarAudioLogo();

  // Durante a intro, clique/tecla apenas pula a abertura.
  setTimeout(() => {
    window.addEventListener('keydown', finish, {once:true});
    splash.addEventListener('click', finish, {once:true});
  }, 500);

  setTimeout(finish, 4300);
})();
