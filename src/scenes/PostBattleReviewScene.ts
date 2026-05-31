import { Text, Graphics } from 'pixi.js';
import { BaseScene } from './BaseScene';
import { SceneManager } from './SceneManager';
import { MainMenuScene } from './MainMenuScene';
import { QueueItem } from '../system/BattleQueue';
import { PlayerState } from '../state/PlayerState';
import { SRSEngine } from '../system/SRSEngine';
import { SRSRating, WordSRSState } from '../types/srs';
import { CloudSave } from '../utils/CloudSave';
import { DailyQuota } from '../system/DailyQuota';
import { UI_STYLE } from '../ui/UIStyle';
import { soundManager } from '../utils/SoundManager';

export class PostBattleReviewScene extends BaseScene {
  private items: QueueItem[];
  private currentIndex: number = 0;
  private srsEngine = new SRSEngine();
  
  // UI
  private wordText!: Text;
  private defText!: Text;
  private infoText!: Text;
  private buttonsContainer: Graphics = new Graphics();

  constructor(items: QueueItem[]) {
    super();
    // Filter out duplicates if a word was retried multiple times.
    // In BattleQueue, processedItems might have multiple entries for the same word if we failed the "Again" retry entirely,
    // but typically we can just evaluate it once. Let's group by word id and take the final result.
    const uniqueMap = new Map<string, QueueItem>();
    for (const item of items) {
      const existing = uniqueMap.get(item.word.id);
      if (!existing || item.attempts > existing.attempts || item.isRetry) {
        uniqueMap.set(item.word.id, item);
      }
    }
    this.items = Array.from(uniqueMap.values());
  }

  async init(): Promise<void> {
    const { width, height } = SceneManager.getScreenSize();

    const title = new Text({
      text: '戰後評分 (Post-Battle Review)',
      style: { 
        fill: UI_STYLE.COLORS.TEXT_MAIN, 
        fontSize: 32, 
        fontWeight: 'bold',
        fontFamily: UI_STYLE.FONTS.MONO 
      }
    });
    title.anchor.set(0.5);
    title.x = width / 2;
    title.y = 100;
    this.addChild(title);

    this.wordText = new Text({
      text: '',
      style: { 
        fill: UI_STYLE.COLORS.SUCCESS, 
        fontSize: 64, 
        fontFamily: UI_STYLE.FONTS.MONO, 
        fontWeight: 'bold',
        dropShadow: { alpha: 0.8, blur: 4, color: UI_STYLE.COLORS.SECONDARY, distance: 0 }
      }
    });
    this.wordText.anchor.set(0.5);
    this.wordText.x = width / 2;
    this.wordText.y = height / 2 - 100;
    this.addChild(this.wordText);

    this.defText = new Text({
      text: '',
      style: { 
        fill: UI_STYLE.COLORS.TEXT_MAIN, 
        fontSize: 28,
        fontFamily: UI_STYLE.FONTS.SANS 
      }
    });
    this.defText.anchor.set(0.5);
    this.defText.x = width / 2;
    this.defText.y = height / 2 - 30;
    this.addChild(this.defText);

    this.infoText = new Text({
      text: '',
      style: { 
        fill: UI_STYLE.COLORS.ACCENT, 
        fontSize: 20,
        fontFamily: UI_STYLE.FONTS.SANS 
      }
    });
    this.infoText.anchor.set(0.5);
    this.infoText.x = width / 2;
    this.infoText.y = height / 2 + 30;
    this.addChild(this.infoText);

    // Glass panel for word
    const panel = new Graphics();
    panel.roundRect(width / 2 - 400, height / 2 - 160, 800, 240, 12);
    panel.fill({ color: UI_STYLE.COLORS.GLASS_BG, alpha: UI_STYLE.GLASS_ALPHA });
    panel.stroke({ color: UI_STYLE.COLORS.SECONDARY, width: 2, alpha: 0.3 });
    this.addChildAt(panel, 1);

    this.buttonsContainer.x = width / 2;
    this.buttonsContainer.y = height / 2 + 150;
    this.addChild(this.buttonsContainer);
  }

  private keyHandler = (e: KeyboardEvent) => this.handleKeyDown(e);

  start(): void {
    if (this.items.length === 0) {
      this.finishReview();
      return;
    }
    window.addEventListener('keydown', this.keyHandler);
    this.showCurrentWord();
  }

  stop(): void {
    window.removeEventListener('keydown', this.keyHandler);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (this.currentIndex >= this.items.length) return;
    
    const item = this.items[this.currentIndex];
    const wasRetrySuccess = item.isRetry && item.retrySuccess;

    // 如果該單字重練成功，則強迫最高只能選 Hard (2)
    switch(e.key) {
      case '1':
        this.rateWord(item, 'again');
        break;
      case '2':
        this.rateWord(item, 'hard');
        break;
      case '3':
        if (!wasRetrySuccess) this.rateWord(item, 'good');
        break;
      case '4':
        if (!wasRetrySuccess) this.rateWord(item, 'easy');
        break;
    }
  }

  private showCurrentWord() {
    this.buttonsContainer.removeChildren();
    
    if (this.currentIndex >= this.items.length) {
      this.finishReview();
      return;
    }

    const item = this.items[this.currentIndex];
    this.wordText.text = item.word.word;
    this.defText.text = item.word.definition;
    
    // Pronounce word
    soundManager.speak(item.word.word);
    
    // Check if it was a retry
    const wasMistake = item.isRetry && !item.retrySuccess;
    const wasRetrySuccess = item.isRetry && item.retrySuccess;

    if (wasMistake) {
      this.infoText.text = '此單字在戰鬥中失敗且未通過重練';
    } else if (wasRetrySuccess) {
      this.infoText.text = '此單字在戰鬥中錯過，後來重練成功';
    } else {
      this.infoText.text = '您在戰鬥中一次就通過了！';
    }

    // Config Buttons
    const buttons = [
      { label: '[1] Again\n重壓', rating: 'again' as SRSRating, color: UI_STYLE.COLORS.PRIMARY },
      { label: '[2] Hard\n困難', rating: 'hard' as SRSRating, color: 0xf97316 },
      { label: '[3] Good\n熟悉', rating: 'good' as SRSRating, color: UI_STYLE.COLORS.SECONDARY },
      { label: '[4] Easy\n簡單', rating: 'easy' as SRSRating, color: UI_STYLE.COLORS.SUCCESS },
    ];

    const gap = 160;
    const startX = -1.5 * gap;

    buttons.forEach((btnConf, idx) => {
      // If the word was retried, don't allow it to be rated Easy, cap at Hard or Good (SRSEngine downgrades internally, but visually we can just disable or let SRSEngine handle it)
      // Visual indicator:
      const isDowngraded = wasRetrySuccess && (btnConf.rating === 'good' || btnConf.rating === 'easy');
      
      const btn = new Graphics()
        .roundRect(0, 0, 120, 60, 8)
        .fill(isDowngraded ? 0x52525b : btnConf.color);
      
      btn.pivot.set(60, 30);
      btn.x = startX + idx * gap;
      btn.eventMode = 'static';
      btn.cursor = isDowngraded ? 'not-allowed' : 'pointer';

      const tf = new Text({
        text: btnConf.label,
        style: { fill: 0xffffff, fontSize: 18, align: 'center' }
      });
      tf.anchor.set(0.5);
      tf.x = btn.x;
      tf.y = btn.y;

      if (!isDowngraded) {
        btn.on('pointerdown', () => {
          soundManager.playType();
          this.rateWord(item, btnConf.rating);
        });
        btn.on('pointerover', () => { btn.alpha = 0.8; });
        btn.on('pointerout', () => { btn.alpha = 1; });
      }

      this.buttonsContainer.addChild(btn, tf);
    });
  }

  private rateWord(item: QueueItem, rating: SRSRating) {
    const player = PlayerState.getPlayer();
    if (!player) return;

    // Update Player SRS Data
    const state: WordSRSState | null = player.srsData[item.word.id] || null;
    const isCorrect = item.attempts === 0 || item.retrySuccess;
    
    // Update Quota tracking if this is its first encounter or successful review
    if (!state || state.te === 0) {
      if (isCorrect) {
        const dq = DailyQuota.fromState(player.dailyQuota);
        dq.incrementLearnedNew();
        player.dailyQuota = dq.getState();
      }
    } else {
      if (isCorrect && rating !== 'again') {
        const dq = DailyQuota.fromState(player.dailyQuota);
        dq.incrementReviewed();
        player.dailyQuota = dq.getState();
      }
    }

    // Call SRSEngine to determine new SM-2 scheduling
    const newState = this.srsEngine.updateState(
      state, 
      rating, 
      isCorrect, 
      item.isRetry, 
      player.currentLevel
    );
    
    player.srsData[item.word.id] = newState;

    this.currentIndex++;
    this.showCurrentWord();
  }

  private async finishReview() {
    this.buttonsContainer.removeChildren();
    
    this.wordText.text = '評分儲存中...';
    this.wordText.style.fill = 0xfacc15;
    this.defText.text = '';
    this.infoText.text = '正在將紀錄同步回 Google Sheets';
    soundManager.playHit();

    const player = PlayerState.getPlayer();
    if (player) {
      await CloudSave.savePlayer(player);
    }

    this.wordText.text = '儲存完成！';
    this.wordText.style.fill = 0x4ade80;

    setTimeout(() => {
      SceneManager.switchScene(new MainMenuScene());
    }, 1000);
  }
}
