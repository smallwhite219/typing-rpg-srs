import { Container, Graphics } from 'pixi.js';

export class TimerBar extends Container {
  private bgBar: Graphics;
  private fgBar: Graphics;
  private barWidth: number;
  private barHeight: number;

  private totalTimeMs: number = 0;
  private currentTimeMs: number = 0;
  private isRunning: boolean = false;
  private onTimeout?: () => void;

  constructor(width: number, height: number) {
    super();
    this.barWidth = width;
    this.barHeight = height;

    this.bgBar = new Graphics()
      .roundRect(0, 0, width, height, height / 2)
      .fill(0x334155);

    this.fgBar = new Graphics()
      .roundRect(0, 0, width, height, height / 2)
      .fill(0x3b82f6);

    this.addChild(this.bgBar, this.fgBar);
  }

  public start(timeMs: number, onTimeout: () => void) {
    this.totalTimeMs = timeMs;
    this.currentTimeMs = timeMs;
    this.onTimeout = onTimeout;
    this.isRunning = true;
    this.updateVisual();
  }

  public stop() {
    this.isRunning = false;
  }

  public update(deltaMs: number) {
    if (!this.isRunning) return;

    this.currentTimeMs -= deltaMs;

    if (this.currentTimeMs <= 0) {
      this.currentTimeMs = 0;
      this.isRunning = false;
      this.updateVisual();
      if (this.onTimeout) this.onTimeout();
      return;
    }

    this.updateVisual();
  }

  private updateVisual() {
    const ratio = Math.max(0, this.currentTimeMs / this.totalTimeMs);
    this.fgBar.scale.x = ratio;

    // Color logic: turn yellow at 50%, red at 25%
    this.fgBar.clear();
    
    let color = 0x3b82f6; // blue
    if (ratio < 0.25) color = 0xef4444; // red
    else if (ratio < 0.5) color = 0xfacc15; // yellow

    this.fgBar.roundRect(0, 0, this.barWidth, this.barHeight, this.barHeight / 2).fill(color);
  }
}
