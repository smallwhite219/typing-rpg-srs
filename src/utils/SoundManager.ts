/**
 * SoundManager - 音效管理器 (Web Audio API)
 * 提供精確的打字與戰鬥能量回饋。
 */

class SoundManager {
  private context: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // 延遲初始化以符合瀏覽器自動播放策略
  }

  public init() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  /**
   * 播放機械鍵盤聲 (低延遲合成音)
   */
  public playType() {
    if (!this.enabled) return;
    this.init();
    if (!this.context) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400 + Math.random() * 100, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.05, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.context.destination);

    osc.start();
    osc.stop(this.context.currentTime + 0.05);
  }

  /**
   * 播放錯誤聲 (低沉波)
   */
  public playError() {
    if (!this.enabled) return;
    this.init();
    if (!this.context) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.context.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.1, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.context.destination);

    osc.start();
    osc.stop(this.context.currentTime + 0.2);
  }

  /**
   * 播放擊中聲 (高頻爆裂)
   */
  public playHit() {
    if (!this.enabled) return;
    this.init();
    if (!this.context) return;

    // 白噪音生成
    const bufferSize = this.context.sampleRate * 0.1;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.context.currentTime);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.2, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);

    noise.start();
  }

  public speak(text: string) {
    if (!this.enabled) return;
    if (!('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.voice = this.pickEnglishVoice();
    window.speechSynthesis.speak(utterance);
  }

  private pickEnglishVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(voice => voice.lang.startsWith('en-US'))
      || voices.find(voice => voice.lang.startsWith('en'))
      || null;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
  }
}

export const soundManager = new SoundManager();
