import { Text, Graphics } from 'pixi.js';
import { BaseScene } from './BaseScene';
import { SceneManager } from './SceneManager';
import { VocabManager } from '../data/VocabManager';
import { PlayerState } from '../state/PlayerState';
import { CombatScene } from './CombatScene';
import { WordListScene } from './WordListScene';
import { DailyQuota } from '../system/DailyQuota';
import { ProgressBar } from '../ui/ProgressBar';
import { UI_STYLE } from '../ui/UIStyle';
import { soundManager } from '../utils/SoundManager';

export class MainMenuScene extends BaseScene {
  async init(): Promise<void> {
    const { width, height } = SceneManager.getScreenSize();
    
    // Background
    const bg = new Graphics();
    bg.rect(0, 0, width, height);
    bg.fill({ color: UI_STYLE.COLORS.BG_DARK });
    for (let i = 0; i < height; i += 4) {
      bg.rect(0, i, width, 1);
      bg.fill({ color: 0x000000, alpha: 0.3 });
    }
    this.addChildAt(bg, 0);

    const title = new Text({
      text: '⚔️ TYPING RPG × SRS',
      style: { 
        fill: UI_STYLE.COLORS.PRIMARY, 
        fontSize: 56, 
        fontWeight: 'bold',
        fontFamily: UI_STYLE.FONTS.MONO,
        dropShadow: { alpha: 0.8, blur: 8, color: UI_STYLE.COLORS.SECONDARY, distance: 0 }
      }
    });
    title.anchor.set(0.5);
    title.x = width / 2;
    title.y = 100;
    this.addChild(title);

    const player = PlayerState.getPlayer();
    const allWords = VocabManager.getAllWords();
    const srsData = player?.srsData || {};
    const currentLevel = player?.currentLevel || 1;

    const totalCount = allWords.length;
    let unseenCount = 0;
    let blindPassedCount = 0;
    let toReviewCount = 0;

    for (const word of allWords) {
      const state = srsData[word.id];
      if (!state || state.rp === 0) {
        unseenCount++;
      } else {
        if (state.fm === 'easy') blindPassedCount++;
        if (state.nr <= currentLevel) toReviewCount++;
      }
    }

    const infoStr = 
      `歡迎使用, ${player?.displayName || '戰士'}\n` +
      `單字庫總量: ${totalCount}  |  尚未遇見: ${unseenCount}\n` +
      `盲打大師: ${blindPassedCount}  |  戰場複習: ${toReviewCount}`;
 
    const info = new Text({
      text: infoStr,
      style: { 
        fill: UI_STYLE.COLORS.TEXT_MAIN, 
        fontSize: 18, 
        align: 'center', 
        lineHeight: 28,
        fontFamily: UI_STYLE.FONTS.SANS 
      }
    });
    info.anchor.set(0.5);
    info.x = width / 2;
    info.y = 190;
    this.addChild(info);

    // Stats Glass Panel
    const statsPanel = new Graphics();
    statsPanel.roundRect(width / 2 - 350, 160, 700, 220, 12);
    statsPanel.fill({ color: UI_STYLE.COLORS.GLASS_BG, alpha: UI_STYLE.GLASS_ALPHA });
    statsPanel.stroke({ color: UI_STYLE.COLORS.SECONDARY, width: 2, alpha: 0.3 });
    this.addChildAt(statsPanel, 1);

    const quotaData = player?.dailyQuota || { date: '', learnedNew: 0, reviewed: 0 };
    const dq = DailyQuota.fromState(quotaData);
    const progress = dq.getProgress();
 
    const newBar = new ProgressBar('🆕 記憶同步進度', 300, 15, UI_STYLE.COLORS.SECONDARY);
    newBar.x = width / 2 - 150;
    newBar.y = 260;
    newBar.setProgress(progress.newLearned, progress.newTotal);
    this.addChild(newBar);
 
    const revBar = new ProgressBar('🔁 戰場強化進度', 300, 15, UI_STYLE.COLORS.SUCCESS);
    revBar.x = width / 2 - 150;
    revBar.y = 320;
    revBar.setProgress(progress.reviewLearned, progress.reviewTotal);
    this.addChild(revBar);

    // Word Count Selector
    let selectedWordCount = 5;
    
    // UI elements for word count
    const countContainer = new Graphics();
    countContainer.x = width / 2;
    countContainer.y = 420;
    this.addChild(countContainer);

    const countText = new Text({
      text: `回合字數: ${selectedWordCount}`,
      style: { fill: 0xffffff, fontSize: 20 }
    });
    countText.anchor.set(0.5);
    countContainer.addChild(countText);

    // Decrement Button
    const decBtn = new Text({
      text: '◀',
      style: { fill: 0x94a3b8, fontSize: 24 }
    });
    decBtn.anchor.set(0.5);
    decBtn.x = -80;
    decBtn.eventMode = 'static';
    decBtn.cursor = 'pointer';
    decBtn.on('pointerdown', () => {
      selectedWordCount = Math.max(5, selectedWordCount - 5);
      countText.text = `回合字數: ${selectedWordCount}`;
    });
    countContainer.addChild(decBtn);

    // Increment Button
    const incBtn = new Text({
      text: '▶',
      style: { fill: 0x94a3b8, fontSize: 24 }
    });
    incBtn.anchor.set(0.5);
    incBtn.x = 80;
    incBtn.eventMode = 'static';
    incBtn.cursor = 'pointer';
    incBtn.on('pointerdown', () => {
      selectedWordCount = Math.min(20, selectedWordCount + 5);
      countText.text = `回合字數: ${selectedWordCount}`;
    });
    countContainer.addChild(incBtn);

    // Battle Button
    const btn = new Graphics()
      .roundRect(0, 0, 280, 70, 15)
      .fill(UI_STYLE.COLORS.PRIMARY);
    btn.pivot.set(140, 35);
    btn.x = width / 2;
    btn.y = 520;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
 
    const btnText = new Text({
      text: '進入戰場 (SPACE)',
      style: { 
        fill: 0xffffff, 
        fontSize: 26, 
        fontWeight: 'bold',
        fontFamily: UI_STYLE.FONTS.MONO,
        dropShadow: { alpha: 0.5, blur: 4, color: 0x000000, distance: 2 }
      }
    });
    btnText.anchor.set(0.5);
    btnText.x = width / 2;
    btnText.y = 520;
 
    const startBattle = () => {
      soundManager.playHit();
      window.removeEventListener('keydown', keyboardListener);
      SceneManager.switchScene(new CombatScene(selectedWordCount));
    };
 
    btn.on('pointerdown', startBattle);
    btn.on('pointerover', () => { 
        btn.alpha = 0.9;
        btn.scale.set(1.05);
        soundManager.playType();
    });
    btn.on('pointerout', () => { 
        btn.alpha = 1;
        btn.scale.set(1);
    });
 
    this.addChild(btn, btnText);

    // Settings Button
    const settingsBtn = new Graphics()
      .roundRect(0, 0, 280, 50, 10)
      .fill(0x3f3f46);
    settingsBtn.pivot.set(140, 25);
    settingsBtn.x = width / 2;
    settingsBtn.y = 610;
    settingsBtn.eventMode = 'static';
    settingsBtn.cursor = 'pointer';
    settingsBtn.stroke({ color: 0xffffff, width: 2, alpha: 0.3 });

    const settingsBtnText = new Text({
      text: '單字庫設定 (V)',
      style: { 
        fill: 0xffffff, 
        fontSize: 20, 
        fontWeight: 'bold',
        fontFamily: UI_STYLE.FONTS.MONO,
        dropShadow: { alpha: 0.5, blur: 4, color: 0x000000, distance: 2 }
      }
    });
    settingsBtnText.anchor.set(0.5);
    settingsBtnText.x = width / 2;
    settingsBtnText.y = 610;

    const openSettings = () => {
      soundManager.playHit();
      window.removeEventListener('keydown', keyboardListener);
      SceneManager.switchScene(new WordListScene());
    };

    settingsBtn.on('pointerdown', openSettings);
    settingsBtn.on('pointerover', () => { 
        settingsBtn.alpha = 0.9;
        settingsBtn.scale.set(1.05);
        soundManager.playType();
    });
    settingsBtn.on('pointerout', () => { 
        settingsBtn.alpha = 1;
        settingsBtn.scale.set(1);
    });

    this.addChild(settingsBtn, settingsBtnText);

    // Keyboard listener
    const keyboardListener = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        startBattle();
      } else if (e.code === 'ArrowLeft') {
        selectedWordCount = Math.max(5, selectedWordCount - 5);
        countText.text = `回合字數: ${selectedWordCount}`;
      } else if (e.code === 'ArrowRight') {
        selectedWordCount = Math.min(20, selectedWordCount + 5);
        countText.text = `回合字數: ${selectedWordCount}`;
      } else if (e.code === 'KeyV' || e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        openSettings();
      }
    };
    window.addEventListener('keydown', keyboardListener);
    // Cleanup on stop
    this.onStop = () => window.removeEventListener('keydown', keyboardListener);
  }

  private onStop?: () => void;

  start(): void {}
  stop(): void {
    if (this.onStop) this.onStop();
  }
}

