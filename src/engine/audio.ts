export class AudioEngine {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private isPlaying = false;

  private ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 3000;
      this.filter.Q.value = 1;

      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0;

      this.filter.connect(this.gain);
      this.gain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  start() {
    this.ensureContext();
    if (this.isPlaying || !this.ctx || !this.filter || !this.gain) return;
    this.osc = this.ctx.createOscillator();
    this.osc.type = 'sine';
    this.osc.frequency.value = 220;
    this.osc.connect(this.filter);
    this.osc.start();
    this.isPlaying = true;
  }

  update(yValue: number, yMin: number, yMax: number) {
    if (!this.isPlaying || !this.ctx || !this.gain || !this.osc) return;
    const range = yMax - yMin;
    const normalized = Math.max(0, Math.min(1, (yValue - yMin) / range));
    const freq = 120 + normalized * 680;
    const now = this.ctx.currentTime;
    this.osc.frequency.setTargetAtTime(freq, now, 0.02);
    this.gain.gain.setTargetAtTime(0.15, now, 0.03);
  }

  silence() {
    if (!this.ctx || !this.gain) return;
    this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  stop() {
    if (!this.isPlaying || !this.osc || !this.ctx || !this.gain) return;
    this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    this.osc.stop(this.ctx.currentTime + 0.1);
    this.osc = null;
    this.isPlaying = false;
  }

  get playing() { return this.isPlaying; }
}
