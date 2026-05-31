import { Application } from 'pixi.js';
import { VocabManager } from './data/VocabManager';
import { PlayerState } from './state/PlayerState';
import { SceneManager } from './scenes/SceneManager';
import { LoginScene } from './scenes/LoginScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { soundManager } from './utils/SoundManager';

async function main() {
  const app = new Application();

  await app.init({
    width: 1024,
    height: 768,
    backgroundColor: 0x16213e,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  document.getElementById('app')!.appendChild(app.canvas);

  console.log('Typing RPG × SRS 啟動中...');

  // 1. 初始化資料層
  await VocabManager.initialize();
  const isLoggedIn = await PlayerState.initialize();

  // 啟用音效 (解鎖瀏覽器自動播放限制)
  const unlockAudio = () => {
    soundManager.init();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);

  // 2. 初始化場景管理器
  SceneManager.initialize(app);

  // 3. 根據登入狀態決定初始畫面
  if (isLoggedIn) {
    SceneManager.switchScene(new MainMenuScene());
  } else {
    SceneManager.switchScene(new LoginScene());
  }

  // 掛載到 window 物件以供 Console 測試 (可選留)
  (window as any).TypingRPG = {
    VocabManager,
    PlayerState,
    SceneManager
  };

  console.log('啟動完成！');
}

main();

