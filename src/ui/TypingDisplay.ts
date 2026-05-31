import { Container, Text, Graphics } from 'pixi.js';
import { UI_STYLE } from './UIStyle';
import { soundManager } from '../utils/SoundManager';

export interface TypingConfig {
  word: string;
  definition: string;
  isSentence: boolean;
  isHidden?: boolean;
  onComplete: (success: boolean) => void;
  onMistake: () => void;
}

export class TypingDisplay extends Container {
  private config!: TypingConfig;
  private typedChars: string[] = [];
  private currentIdx: number = 0;
  private errorIndices: Set<number> = new Set();

  private readonly minPanelWidth: number = 560;
  private readonly maxPanelWidth: number = 940;
  private readonly panelPaddingX: number = 44;
  private readonly panelPaddingTop: number = 22;
  private readonly panelPaddingBottom: number = 22;
  private readonly panelGap: number = 18;
  private readonly sentenceMinFontSize: number = 24;
  private readonly sentenceMaxFontSize: number = 42;
  private readonly sentenceMaxLines: number = 2;
  private readonly longPromptMaxLines: number = 3;

  private availableWidth: number = 860;
  private panelWidth: number = 600;
  private panelHeight: number = 180;
  private panelTop: number = -60;
  
  // UI Elements
  private wordTextObj: Text;
  private defTextObj: Text;
  private mistakeCount: number = 0;
  
  // Animation props
  private shakeOffset: { x: number; y: number } = { x: 0, y: 0 };
  private shakeTimer: number = 0;
  private isErrorFlash: boolean = false;
  private flashTimer: number = 0;
  private bgGraphics: Graphics;
  private baseWordY: number = 0;
  private baseDefY: number = 80;

  constructor() {
    super();

    // Glass Background
    this.bgGraphics = new Graphics();
    this.addChild(this.bgGraphics);

    // The main word text
    this.wordTextObj = new Text({
      text: '',
      style: {
        fontSize: 56,
        fontFamily: UI_STYLE.FONTS.MONO,
        fill: UI_STYLE.COLORS.TEXT_MAIN,
        letterSpacing: 6,
        dropShadow: {
            alpha: 0.8,
            blur: 4,
            color: UI_STYLE.COLORS.SECONDARY,
            distance: 0,
        },
        stroke: { color: UI_STYLE.COLORS.SECONDARY, width: 2 },
      }
    });
    this.wordTextObj.anchor.set(0.5);

    // The definition text
    this.defTextObj = new Text({
      text: '',
      style: {
        fontSize: 24,
        fontFamily: UI_STYLE.FONTS.SANS,
        fill: UI_STYLE.COLORS.TEXT_DIM,
        align: 'center',
        wordWrap: true,
      }
    });
    this.defTextObj.anchor.set(0.5);
    this.defTextObj.y = this.baseDefY;

    this.addChild(this.wordTextObj, this.defTextObj);
    this.drawBackground();
  }

  public setViewportWidth(width: number) {
    const maxWidth = Math.max(this.minPanelWidth, this.maxPanelWidth);
    this.availableWidth = Math.max(this.minPanelWidth, Math.min(width, maxWidth));
    this.updateVisual();
  }

  private drawBackground() {
    this.bgGraphics.clear();
    this.bgGraphics.roundRect(-this.panelWidth / 2, this.panelTop, this.panelWidth, this.panelHeight, 12);
    this.bgGraphics.fill({ color: UI_STYLE.COLORS.GLASS_BG, alpha: UI_STYLE.GLASS_ALPHA });
  }

  public setPrompt(config: TypingConfig) {
    this.config = config;
    this.typedChars = [];
    this.currentIdx = 0;
    this.mistakeCount = 0;
    this.errorIndices.clear();
    
    // 如果是隱藏模式，附加提示告知
    this.defTextObj.text = config.definition + (config.isHidden ? " (盲打測試)" : "");
    this.updateVisual();
  }

  /**
   * Handle incoming keyboard event character
   * @param key the `event.key` from browser
   */
  public handleKey(key: string) {
    if (!this.config) return;
    
    // Ignore meta keys
    if (key.length > 1) {
      if (key === 'Backspace' && this.config.isSentence && this.currentIdx > 0) {
        this.currentIdx--;
        this.errorIndices.delete(this.currentIdx);
        this.updateVisual();
      }
      return;
    }

    const targetChar = this.config.word[this.currentIdx];

    if (this.config.isSentence) {
      // Sentence mode: monkeys type (allow mistakes, proceed forward)
      if (key.toLowerCase() === targetChar.toLowerCase()) {
        this.typedChars[this.currentIdx] = targetChar;
      } else {
        this.errorIndices.add(this.currentIdx);
        this.config.onMistake();
        this.updateVisual();
      }
      this.currentIdx++;
      
      // Check for completion
      if (this.currentIdx >= this.config.word.length) {
        this.finishSentence();
      } else {
        this.updateVisual();
      }
    } else {
      // Word mode: strict typing (block on error)
      if (key.toLowerCase() === targetChar.toLowerCase()) {
        this.currentIdx++;
        this.isErrorFlash = false;
        soundManager.playType();
        
        // Check for completion
        if (this.currentIdx >= this.config.word.length) {
          soundManager.playHit();
          this.config.onComplete(true);
        } else {
          this.updateVisual();
        }
      } else {
        // Mistake!
        this.mistakeCount++;
        this.isErrorFlash = true;
        this.flashTimer = 10;
        this.shakeTimer = 15; // 震動 15 幀
        soundManager.playError();
        
        // Reveal hidden word if mistakes >= 2
        if (this.config.isHidden && this.mistakeCount >= 2) {
          this.config.isHidden = false;
          this.defTextObj.text = this.config.definition + " (提示解鎖)";
        }

        this.config.onMistake();
        this.updateVisual();
      }
    }
  }

  private finishSentence() {
    const errorCount = this.errorIndices.size;
    const total = this.config.word.length;
    const accuracy = (total - errorCount) / total;
    
    this.updateVisual();
    // > 80% is pass
    this.config.onComplete(accuracy >= 0.8);
  }

  public update(deltaFrames: number) {
    if (this.isErrorFlash) {
      this.flashTimer -= deltaFrames;
      if (this.flashTimer <= 0) {
        this.isErrorFlash = false;
        this.updateVisual();
      }
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer -= deltaFrames;
      this.shakeOffset.x = (Math.random() - 0.5) * UI_STYLE.SHAKE_INTENSITY * 2;
      this.shakeOffset.y = (Math.random() - 0.5) * UI_STYLE.SHAKE_INTENSITY * 2;
      
      this.wordTextObj.x = this.shakeOffset.x;
      this.wordTextObj.y = this.baseWordY + this.shakeOffset.y;
      this.defTextObj.x = this.shakeOffset.x;
      this.defTextObj.y = this.baseDefY + this.shakeOffset.y;
      this.bgGraphics.x = this.shakeOffset.x;
      this.bgGraphics.y = this.shakeOffset.y;

      if (this.shakeTimer <= 0) {
        this.wordTextObj.x = 0;
        this.wordTextObj.y = this.baseWordY;
        this.defTextObj.x = 0;
        this.defTextObj.y = this.baseDefY;
        this.bgGraphics.x = 0;
        this.bgGraphics.y = 0;
      }
    }
  }

  private updateVisual() {
    if (!this.config) return;

    const target = this.config.word;
    const completed = target.substring(0, this.currentIdx);
    let cursor = target.substring(this.currentIdx, this.currentIdx + 1);
    let remaining = target.substring(this.currentIdx + 1);

    // 盲打模式下隱藏未輸入的部分，但不隱藏標點符號與空白
    if (this.config.isHidden) {
      const hideFn = (str: string) => str.replace(/[A-Za-z0-9]/g, '*');
      cursor = hideFn(cursor);
      remaining = hideFn(remaining);
    }

    const displayText = `${completed}[${cursor}]${remaining}`;
    this.wordTextObj.text = displayText;

    this.applyPromptStyle(displayText);
    this.layoutPanel();

    if (this.isErrorFlash) {
      this.wordTextObj.style.fill = UI_STYLE.COLORS.PRIMARY;
      this.bgGraphics.tint = UI_STYLE.COLORS.PRIMARY;
    } else {
      this.wordTextObj.style.fill = UI_STYLE.COLORS.SUCCESS;
      this.bgGraphics.tint = 0xffffff;
    }
  }

  private applyPromptStyle(displayText: string) {
    const usesWrappedLayout = this.shouldUseWrappedPromptLayout(displayText);

    if (!usesWrappedLayout) {
      Object.assign(this.wordTextObj.style, {
        fontSize: 56,
        letterSpacing: 6,
        wordWrap: false,
        align: 'center',
        lineHeight: 72,
      });
      this.wordTextObj.text = displayText;
      return;
    }

    const wrapWidth = this.getWrapWidth();
    let fontSize = this.pickSentenceFontSize(displayText.length);
    const maxLines = this.config.isSentence ? this.sentenceMaxLines : this.longPromptMaxLines;

    for (let i = 0; i < 12; i++) {
      this.applySentenceStyle(fontSize, wrapWidth);
      this.wordTextObj.text = this.wrapPromptText(displayText, fontSize, wrapWidth);

      if (this.getSentenceLineCount(fontSize) <= maxLines || fontSize <= this.sentenceMinFontSize) {
        break;
      }

      fontSize -= 2;
    }
  }

  private applySentenceStyle(fontSize: number, wrapWidth: number) {
    Object.assign(this.wordTextObj.style, {
      fontSize,
      letterSpacing: 0,
      wordWrap: true,
      wordWrapWidth: wrapWidth,
      align: 'center',
      lineHeight: Math.round(fontSize * 1.3),
    });
  }

  private shouldUseWrappedPromptLayout(displayText: string): boolean {
    return this.config.isSentence || displayText.length > 28 || /\s/.test(this.config.word);
  }

  private wrapPromptText(text: string, fontSize: number, wrapWidth: number): string {
    const words = text.split(/(\s+)/);
    const lines: string[] = [];
    let currentLine = '';
    const maxChars = Math.max(10, Math.floor(wrapWidth / (fontSize * 0.62)));

    for (const word of words) {
      if (word === '') continue;

      const candidate = currentLine + word;
      if (currentLine === '' || candidate.length <= maxChars) {
        currentLine = candidate;
        continue;
      }

      lines.push(currentLine.trimEnd());
      currentLine = word.trimStart();

      if (currentLine.length > maxChars) {
        const chunks = this.breakLongToken(currentLine, maxChars);
        lines.push(...chunks.slice(0, -1));
        currentLine = chunks[chunks.length - 1] || '';
      }
    }

    if (currentLine) {
      lines.push(currentLine.trimEnd());
    }

    this.wordTextObj.style.fontSize = fontSize;
    return lines.join('\n');
  }

  private breakLongToken(token: string, maxChars: number): string[] {
    const chunks: string[] = [];

    for (let start = 0; start < token.length; start += maxChars) {
      chunks.push(token.slice(start, start + maxChars));
    }

    return chunks;
  }

  private getSentenceLineCount(fontSize: number): number {
    const lineHeight = Number(this.wordTextObj.style.lineHeight) || Math.round(fontSize * 1.3);
    const textHeight = this.wordTextObj.getLocalBounds().height;
    return Math.max(1, Math.ceil(textHeight / lineHeight));
  }

  private pickSentenceFontSize(length: number): number {
    if (length <= 44) return this.sentenceMaxFontSize;
    if (length <= 64) return 38;
    if (length <= 82) return 34;
    if (length <= 100) return 30;
    return 28;
  }

  private getWrapWidth(): number {
    return Math.max(300, this.availableWidth - this.panelPaddingX * 2);
  }

  private layoutPanel() {
    const maxWidth = Math.min(this.availableWidth, this.maxPanelWidth);

    this.defTextObj.style.wordWrap = true;
    this.defTextObj.style.align = 'center';
    this.defTextObj.style.wordWrapWidth = this.getWrapWidth();

    let wordBounds = this.wordTextObj.getLocalBounds();
    let defBounds = this.defTextObj.getLocalBounds();

    this.panelWidth = Math.max(
      this.minPanelWidth,
      Math.min(Math.max(wordBounds.width, defBounds.width) + this.panelPaddingX * 2, maxWidth)
    );

    const innerWidth = Math.max(300, this.panelWidth - this.panelPaddingX * 2);
    this.defTextObj.style.wordWrapWidth = innerWidth;

    if (this.shouldUseWrappedPromptLayout(this.wordTextObj.text)) {
      const displayText = this.wordTextObj.text;
      let fontSize = Number(this.wordTextObj.style.fontSize) || this.sentenceMaxFontSize;
      const maxLines = this.config.isSentence ? this.sentenceMaxLines : this.longPromptMaxLines;

      for (let i = 0; i < 8; i++) {
        this.applySentenceStyle(fontSize, innerWidth);
        this.wordTextObj.text = this.wrapPromptText(displayText.replace(/\n/g, ' '), fontSize, innerWidth);
        if (this.getSentenceLineCount(fontSize) <= maxLines || fontSize <= this.sentenceMinFontSize) {
          break;
        }
        fontSize -= 2;
      }
    }

    wordBounds = this.wordTextObj.getLocalBounds();
    defBounds = this.defTextObj.getLocalBounds();

    this.baseWordY = -((defBounds.height + this.panelGap) / 2);
    this.baseDefY = this.baseWordY + wordBounds.height / 2 + this.panelGap + defBounds.height / 2;

    this.wordTextObj.y = this.baseWordY;
    this.defTextObj.y = this.baseDefY;

    const top = this.baseWordY - wordBounds.height / 2 - this.panelPaddingTop;
    const bottom = this.baseDefY + defBounds.height / 2 + this.panelPaddingBottom;

    this.panelTop = top;
    this.panelHeight = Math.max(150, bottom - top);

    this.drawBackground();
  }
}
