import { Text, Graphics } from 'pixi.js';
import { BaseScene } from './BaseScene';
import { SceneManager } from './SceneManager';
import { TypingDisplay } from '../ui/TypingDisplay';
import { TimerBar } from '../ui/TimerBar';
import { PlayerState } from '../state/PlayerState';
import { VocabManager } from '../data/VocabManager';
import { BattleQueue, QueueItem } from '../system/BattleQueue';
import { WordSelector } from '../system/WordSelector';
import { PromptGenerator } from '../system/PromptGenerator';
import { SRSEngine } from '../system/SRSEngine';
import { PostBattleReviewScene } from './PostBattleReviewScene';
import { UI_STYLE } from '../ui/UIStyle';
import { soundManager } from '../utils/SoundManager';

export class CombatScene extends BaseScene {
  private typingDisplay!: TypingDisplay;
  private timerBar!: TimerBar;
  private battleQueue!: BattleQueue;
  private promptGen = new PromptGenerator();
  private srsEngine = new SRSEngine();
  
  private comboLabel!: Text;
  private comboCount: number = 0;

  private currentItem: QueueItem | null = null;
  private isProcessing: boolean = false;
  private batchSize: number;
  private timerWidth: number = 640;
  
  private monsterObj!: Text;
  private monsterBaseY: number = 0;
  private hoverTimer: number = 0;
  private backgroundObj!: Graphics;

  private keyHandler = (e: KeyboardEvent) => this.handleKeyDown(e);

  constructor(batchSize: number = 5) {
    super();
    this.batchSize = batchSize;
  }

  async init(): Promise<void> {
    const { width, height } = SceneManager.getScreenSize();

    // Background
    this.backgroundObj = new Graphics();
    this.backgroundObj.rect(0, 0, width, height);
    this.backgroundObj.fill({ color: UI_STYLE.COLORS.BG_DARK });
    // Draw scanlines
    for (let i = 0; i < height; i += 4) {
      this.backgroundObj.rect(0, i, width, 1);
      this.backgroundObj.fill({ color: 0x000000, alpha: 0.3 });
    }
    this.addChildAt(this.backgroundObj, 0);

    // Stats UI
    this.comboLabel = new Text({
      text: 'Combo: 0',
      style: { 
        fill: UI_STYLE.COLORS.ACCENT, 
        fontSize: 28, 
        fontWeight: 'bold',
        fontFamily: UI_STYLE.FONTS.MONO 
      }
    });
    this.comboLabel.x = 40;
    this.comboLabel.y = 40;
    this.addChild(this.comboLabel);

    // Typing Display
    this.typingDisplay = new TypingDisplay();
    this.typingDisplay.setViewportWidth(width - 96);
    this.typingDisplay.x = width / 2;
    this.typingDisplay.y = height / 2 + 100;
    this.addChild(this.typingDisplay);

    // Timer Bar
    this.timerWidth = Math.max(360, Math.min(760, width - 180));
    this.timerBar = new TimerBar(this.timerWidth, 12);
    this.timerBar.x = width / 2 - this.timerWidth / 2;
    this.timerBar.y = height / 2 + 220;
    this.addChild(this.timerBar);

    // Monster
    this.monsterObj = new Text({
      text: '👾',
      style: { fontSize: 140 }
    });
    this.monsterObj.anchor.set(0.5, 1);
    this.monsterObj.x = width / 2;
    this.addChild(this.monsterObj);
    this.layoutCombatHud();

    // Setup Queue
    const player = PlayerState.getPlayer();
    const allWords = VocabManager.getAllWords();
    const selector = new WordSelector();
    
    // Grab words based on SRS
    const selected = selector.selectForBattle(
      allWords, 
      player?.srsData || {}, 
      player?.currentLevel || 1, 
      this.batchSize
    );

    // If no words available, fallback to pure random or fallback words
    const battleWords = selected.length > 0 
      ? selected.map(s => s.word) 
      : allWords.slice(0, this.batchSize);

    this.battleQueue = new BattleQueue(battleWords);
  }

  start(): void {
    window.addEventListener('keydown', this.keyHandler);
    this.nextPrompt();
  }

  stop(): void {
    window.removeEventListener('keydown', this.keyHandler);
  }

  update(delta: number): void {
    const deltaMs = (1000 / 60) * delta;
    this.timerBar.update(deltaMs);
    this.typingDisplay.update(delta);

    // Monster Hovering
    this.hoverTimer += delta * 0.05;
    this.monsterObj.y = this.monsterBaseY + Math.sin(this.hoverTimer) * 15;
    // Slight scale breathing
    const scale = 1 + Math.sin(this.hoverTimer * 0.5) * 0.05;
    this.monsterObj.scale.set(scale);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (this.isProcessing || !this.currentItem) return;
    this.typingDisplay.handleKey(e.key);
  }

  private nextPrompt() {
    const item = this.battleQueue.peek();

    if (!item) {
      this.endBattle();
      return;
    }

    this.currentItem = item;

    const srsData = PlayerState.getPlayer()?.srsData || {};
    const state = srsData[this.currentItem.word.id];
    const stage = this.srsEngine.getStage(state);
    
    // 如果上次評分為 easy，也就是使用者覺得簡單，這次就出盲打測試
    const isHidden = state && state.fm === 'easy';

    // Force 'word' mode if it's a retry, else generate based on stage logic
    const prompt = this.promptGen.generatePrompt(
      this.currentItem.word, 
      stage, 
      this.currentItem.isRetry ? 'word' : undefined
    );

    soundManager.speak(prompt.targetText);

    this.timerBar.start(prompt.timeLimit * 1000, () => this.onTimeout());

    this.typingDisplay.setPrompt({
      word: prompt.targetText,
      definition: prompt.hintText,
      isSentence: prompt.type === 'sentence',
      isHidden: isHidden,
      onComplete: (success) => this.onComplete(success),
      onMistake: () => this.onMistake()
    });
    this.layoutCombatHud();
  }

  private layoutCombatHud() {
    const { width, height } = SceneManager.getScreenSize();

    this.typingDisplay.x = width / 2;
    this.typingDisplay.y = height / 2 + 100;

    let bounds = this.typingDisplay.getLocalBounds();
    let timerY = this.typingDisplay.y + bounds.y + bounds.height + 28;
    const maxTimerY = height - 40;

    if (timerY > maxTimerY) {
      this.typingDisplay.y -= (timerY - maxTimerY);
      bounds = this.typingDisplay.getLocalBounds();
      timerY = this.typingDisplay.y + bounds.y + bounds.height + 28;
    }

    this.timerBar.x = width / 2 - this.timerWidth / 2;
    this.timerBar.y = timerY;

    this.monsterObj.x = width / 2;
    this.monsterBaseY = Math.min(height / 2 - 50, this.typingDisplay.y + bounds.y - 30);
    this.monsterObj.y = this.monsterBaseY;
  }

  private onMistake() {
    this.comboCount = 0;
    this.updateComboUI();
  }

  private onTimeout() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    if (this.currentItem) {
      this.comboCount = 0;
      this.updateComboUI();
      this.battleQueue.handleError(this.currentItem);
    }

    setTimeout(() => {
      this.isProcessing = false;
      this.nextPrompt();
    }, 500);
  }

  private onComplete(success: boolean) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.timerBar.stop();

    if (success && this.currentItem) {
      if (this.currentItem.isRetry) {
        this.battleQueue.markRetrySuccess(this.currentItem);
        this.comboCount = 1; // 恢復 1
      } else {
        this.comboCount++;
      }
      this.updateComboUI();
      this.battleQueue.dequeue();
    } else if (!success && this.currentItem) {
      this.comboCount = 0;
      this.updateComboUI();
      this.battleQueue.handleError(this.currentItem);
    }

    setTimeout(() => {
      this.isProcessing = false;
      this.nextPrompt();
    }, 500);
  }

  private updateComboUI() {
    this.comboLabel.text = `Combo: ${this.comboCount}`;
    const { rating } = this.promptGen.calculateComboDamage(this.comboCount);
    if (rating) {
      this.comboLabel.text += `  ${rating}`;
    }
  }

  private endBattle() {
    this.isProcessing = true;
    // Show win text
    soundManager.playHit(); // Final blow
    const { width, height } = SceneManager.getScreenSize();
    const winText = new Text({
      text: 'BATTLE CLEARED',
      style: { 
        fill: UI_STYLE.COLORS.SUCCESS, 
        fontSize: 80, 
        fontWeight: 'bold',
        fontFamily: UI_STYLE.FONTS.MONO,
        dropShadow: { alpha: 1, blur: 10, color: 0x000000, distance: 0 }
      }
    });
    winText.anchor.set(0.5);
    winText.x = width / 2;
    winText.y = height / 2;
    this.addChild(winText);

    setTimeout(() => {
      SceneManager.switchScene(new PostBattleReviewScene(this.battleQueue.getProcessedItems()));
    }, 2000);
  }
}
