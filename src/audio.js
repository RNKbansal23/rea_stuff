// Procedural Audio Engine for Mechanical Keyboard Sounds (Zero Latency)

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.soundMode = localStorage.getItem("monkey_sound") || "off"; // "off", "cherry", "thock", "typewriter", "pop"
    this.volume = 0.35;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setMode(mode) {
    this.soundMode = mode;
    localStorage.setItem("monkey_sound", mode);
  }

  playKey(isSpace = false, isBackspace = false, isError = false) {
    if (this.soundMode === "off") return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    switch (this.soundMode) {
      case "cherry":
        this.playCherry(t, isSpace, isBackspace, isError);
        break;
      case "thock":
        this.playThock(t, isSpace, isBackspace, isError);
        break;
      case "typewriter":
        this.playTypewriter(t, isSpace, isBackspace, isError);
        break;
      case "pop":
        this.playPop(t, isSpace, isBackspace, isError);
        break;
    }
  }

  // Clicky Cherry MX Blue simulation (crisp snap + spring transient)
  playCherry(t, isSpace, isBackspace, isError) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    let freq = 1200 + Math.random() * 300;
    if (isSpace) freq = 800;
    if (isBackspace) freq = 950;
    if (isError) freq = 450;

    osc.type = "square";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.04);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq * 1.5, t);
    filter.Q.setValueAtTime(3.5, t);

    gain.gain.setValueAtTime(this.volume * 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);

    // Subtle bottom-out clack
    const clack = this.ctx.createOscillator();
    const clackGain = this.ctx.createGain();
    clack.type = "sine";
    clack.frequency.setValueAtTime(180, t);
    clack.frequency.exponentialRampToValueAtTime(60, t + 0.03);
    clackGain.gain.setValueAtTime(this.volume * 0.3, t);
    clackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    clack.connect(clackGain);
    clackGain.connect(this.ctx.destination);
    clack.start(t);
    clack.stop(t + 0.035);
  }

  // Deep Acoustic Thock (Lubed Linear Switches)
  playThock(t, isSpace, isBackspace, isError) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    let baseFreq = isSpace ? 110 : (isBackspace ? 140 : 170 + Math.random() * 30);
    if (isError) baseFreq = 90;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(baseFreq * 2.2, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, t + 0.06);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.06);

    gain.gain.setValueAtTime(this.volume * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Vintage Typewriter strike
  playTypewriter(t, isSpace, isBackspace, isError) {
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(isSpace ? 1000 : 2200, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.055);
  }

  // Soft Rubber Dome Bubble Pop
  playPop(t, isSpace, isBackspace, isError) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    let freq = 450 + Math.random() * 120;
    if (isSpace) freq = 320;
    if (isBackspace) freq = 380;

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.8, t + 0.035);

    gain.gain.setValueAtTime(this.volume * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }
}

export const soundEngine = new SoundEngine();
