import { Text, Graphics } from 'pixi.js';
import { BaseScene } from './BaseScene';
import { SceneManager } from './SceneManager';
import { HtmlInputHolder } from '../ui/HtmlInputHolder';
import { PlayerState } from '../state/PlayerState';
import { MainMenuScene } from './MainMenuScene';

export class LoginScene extends BaseScene {
  private classIdInput!: HtmlInputHolder;
  private pinInput!: HtmlInputHolder;
  private statusText!: Text;

  async init(): Promise<void> {
    const { width, height } = SceneManager.getScreenSize();

    const title = new Text({
      text: '登入系統',
      style: { fill: 0xffffff, fontSize: 36, fontWeight: 'bold', fontFamily: 'Microsoft JhengHei' }
    });
    title.anchor.set(0.5);
    title.x = width / 2;
    title.y = height / 2 - 150;
    this.addChild(title);

    // Create a login button
    const btn = new Graphics()
      .roundRect(0, 0, 200, 50, 10)
      .fill(0x3b82f6);
    btn.pivot.set(100, 25);
    btn.x = width / 2;
    btn.y = height / 2 + 100;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const btnText = new Text({
      text: '登入',
      style: { fill: 0xffffff, fontSize: 20, fontWeight: 'bold' }
    });
    btnText.anchor.set(0.5);
    btnText.x = width / 2;
    btnText.y = height / 2 + 100;

    btn.on('pointerdown', () => this.handleLogin());
    btn.on('pointerover', () => { btn.alpha = 0.8; });
    btn.on('pointerout', () => { btn.alpha = 1; });

    this.addChild(btn);
    this.addChild(btnText);

    this.statusText = new Text({
      text: '',
      style: { fill: 0xf87171, fontSize: 16 }
    });
    this.statusText.anchor.set(0.5);
    this.statusText.x = width / 2;
    this.statusText.y = height / 2 + 160;
    this.addChild(this.statusText);

    // Html Inputs
    this.classIdInput = new HtmlInputHolder('text', '座號 (例如: 101-01)', width / 2, height / 2 - 50);
    this.pinInput = new HtmlInputHolder('password', 'PIN 碼', width / 2, height / 2 + 20);
  }

  private async handleLogin() {
    const cid = this.classIdInput.value.trim();
    const pin = this.pinInput.value.trim();

    if (!cid || !pin) {
      this.statusText.text = '請輸入完整資訊';
      return;
    }

    this.statusText.text = '登入中...';
    this.statusText.style.fill = 0xfacc15;

    const success = await PlayerState.login(cid, pin);
    if (success) {
      this.statusText.text = '登入成功！';
      this.statusText.style.fill = 0x4ade80;
      setTimeout(() => {
        SceneManager.switchScene(new MainMenuScene());
      }, 500);
    } else {
      this.statusText.text = '登入失敗：檢查帳號或密碼';
      this.statusText.style.fill = 0xf87171;
    }
  }

  start(): void {
    this.classIdInput.show();
    this.pinInput.show();
    this.classIdInput.focus();
  }

  stop(): void {
    this.classIdInput.destroy();
    this.pinInput.destroy();
  }
}
