(() => {
  const SRC = 'sons/ui-digitacao-cristalino.wav?v=433';
  const pool = Array.from({length:4}, () => {
    const a = new Audio(SRC);
    a.preload = 'auto';
    a.playsInline = true;
    return a;
  });
  let poolIndex = 0;
  let lastSound = 0;
  let lastKeyboardEvent = 0;
  let primed = false;

  function level(mult=1) {
    if (!window.SMSAudio || SMSAudio.isMuted()) return 0;
    return Math.min(1, (SMSAudio.getVolume()/100) * mult);
  }

  function playTyping() {
    const now = performance.now();
    if (now-lastSound < 34) return;
    lastSound = now;
    const v = level(.72);
    if (!v) return;
    const a = pool[poolIndex++ % pool.length];
    try {
      a.pause();
      a.currentTime = 0;
      a.volume = v;
      a.play().catch(()=>{});
    } catch (_) {}
  }

  // No celular, o toque que foca o input e uma interacao valida para
  // liberar o elemento de audio antes do teclado virtual comecar a digitar.
  function primeTypingAudio(e) {
    const el=e.target;
    if (primed || !el?.matches?.('input[type="text"], input:not([type]), textarea')) return;
    primed=true;
    const a=pool[0];
    const old=a.volume;
    a.volume=0;
    a.play().then(()=>{
      a.pause(); a.currentTime=0; a.volume=old;
    }).catch(()=>{ a.volume=old; });
  }
  document.addEventListener('pointerdown', primeTypingAudio, true);
  document.addEventListener('touchstart', primeTypingAudio, {capture:true, passive:true});

  // Teclado fisico / desktop.
  document.addEventListener('keydown', e => {
    const el=e.target;
    if (!el?.matches?.('input[type="text"], input:not([type]), textarea')) return;
    if (e.ctrlKey||e.altKey||e.metaKey||e.repeat) return;
    if (e.key.length===1 || e.key==='Backspace' || e.key==='Delete') {
      lastKeyboardEvent=performance.now();
      playTyping();
    }
  }, true);

  // Teclados virtuais Android/iOS nem sempre disparam keydown. O evento
  // input e confiavel e representa cada insercao/remocao efetiva.
  document.addEventListener('input', e => {
    const el=e.target;
    if (!el?.matches?.('input[type="text"], input:not([type]), textarea')) return;
    if (performance.now()-lastKeyboardEvent < 80) return; // evita som duplo no desktop
    const t=e.inputType || '';
    if (!t || t.startsWith('insert') || t.startsWith('delete')) playTyping();
  }, true);

  document.addEventListener('change', e => {
    if (e.target?.matches?.('select')) SMSAudio?.clique?.();
  }, true);

  document.addEventListener('click', e => {
    const b=e.target?.closest?.('button');
    if (b && b.id!=='somToggle' && b.id!=='smsIntroStart') SMSAudio?.clique?.();
  }, true);
})();
