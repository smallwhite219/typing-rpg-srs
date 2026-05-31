import { Container, Graphics, Text } from 'pixi.js';

export class ProgressBar extends Container {
  private bgBar: Graphics;
  private fgBar: Graphics;
  private labelText: Text;
  private valueText: Text;
  
  private barWidth: number;
  private barHeight: number;
  private fgColor: number;

  constructor(label: string, width: number, height: number, fgColor: number = 0x3b82f6) {
    super();
    this.barWidth = width;
    this.barHeight = height;
    this.fgColor = fgColor;

    this.labelText = new Text({
      text: label,
      style: { fill: 0xffffff, fontSize: 18 }
    });
    this.labelText.y = -25;
    
    this.valueText = new Text({
      text: '0 / 0',
      style: { fill: 0x94a3b8, fontSize: 16 }
    });
    this.valueText.anchor.set(1, 0);
    this.valueText.x = width;
    this.valueText.y = -25;

    this.bgBar = new Graphics()
      .roundRect(0, 0, width, height, height / 2)
      .fill(0x334155);

    this.fgBar = new Graphics()
      .roundRect(0, 0, width, height, height / 2)
      .fill(fgColor);

    this.addChild(this.labelText, this.valueText, this.bgBar, this.fgBar);
    this.setProgress(0, 1);
  }

  public setProgress(current: number, max: number) {
    const safeMax = Math.max(1, max);
    let ratio = Math.max(0, Math.min(1, current / safeMax));
    
    this.fgBar.clear();
    this.fgBar.roundRect(0, 0, this.barWidth * ratio, this.barHeight, this.barHeight / 2).fill(this.fgColor);
    
    this.valueText.text = `${Math.floor(current)} / ${max}`;
  }
}
