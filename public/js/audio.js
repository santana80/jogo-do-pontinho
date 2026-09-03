/* SMS Studio - Etapa 4.2 | Sistema de áudio procedural (Web Audio API) */
(() => {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let master = null;
  let compressor = null;
  let muted = localStorage.getItem('smsStudioSomMutado') === '1';
  let volume = Number(localStorage.getItem('smsStudioVolume') || '80');
  if (!Number.isFinite(volume)) volume = 80;
  volume = Math.max(0, Math.min(100, volume));

  function masterLevel() {
    // Curva mais forte: 100% chega a 1.75x, mantendo níveis baixos controláveis.
    const normalized = volume / 100;
    return muted ? 0 : Math.pow(normalized, 0.78) * 1.75;
  }

  function ensure() {
    if (!AudioCtx) return false;
    if (!ctx) {
      ctx = new AudioCtx();
      master = ctx.createGain();
      compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 16;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.18;
      master.gain.value = masterLevel();
      master.connect(compressor);
      compressor.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function tone(freq, duration, opts={}) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime + (opts.delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + duration);
    const vol = opts.vol || 0.16;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain); gain.connect(master);
    osc.start(t); osc.stop(t + duration + 0.03);
  }

  const api = {
    linha() {
      tone(520, .085, {to: 690, type:'triangle', vol:.24});
    },
    caixa() {
      tone(620, .14, {to: 900, type:'sine', vol:.28});
      tone(930, .18, {delay:.07, to:1180, type:'sine', vol:.23});
    },
    turno() {
      tone(330, .11, {to:410, type:'triangle', vol:.19});
    },
    vitoria() {
      [523,659,784,1047].forEach((f,i)=>tone(f,.25,{delay:i*.10,type:'sine',vol:.24}));
    },
    derrota() {
      tone(420,.28,{to:300,type:'triangle',vol:.24});
      tone(300,.34,{delay:.20,to:210,type:'sine',vol:.20});
    },
    empate() {
      tone(440,.18,{to:520,type:'sine',vol:.20});
      tone(520,.22,{delay:.12,to:440,type:'sine',vol:.18});
    },
    clique() {
      tone(700,.06,{to:850,type:'sine',vol:.11});
    },
    setMuted(value) {
      muted = !!value;
      localStorage.setItem('smsStudioSomMutado', muted ? '1' : '0');
      if (master) master.gain.value = masterLevel();
      document.dispatchEvent(new CustomEvent('sms-audio-change', {detail:{muted}}));
    },
    toggle() { this.setMuted(!muted); return muted; },
    setVolume(value) {
      volume = Math.max(0, Math.min(100, Number(value) || 0));
      localStorage.setItem('smsStudioVolume', String(Math.round(volume)));
      if (volume > 0 && muted) { muted = false; localStorage.setItem('smsStudioSomMutado', '0'); }
      if (master) master.gain.value = masterLevel();
      document.dispatchEvent(new CustomEvent('sms-audio-change', {detail:{muted, volume}}));
      return volume;
    },
    getVolume() { return volume; },
    isMuted() { return muted; },
    unlock() { ensure(); }
  };
  window.SMSAudio = api;
  ['pointerdown','keydown'].forEach(ev=>window.addEventListener(ev,()=>ensure(),{once:true}));
})();
