import { Application } from 'pixi.js';
import { BaseScene } from './BaseScene';

export class SceneManagerService {
  private app: Application | null = null;
  private currentScene: BaseScene | null = null;

  public initialize(app: Application) {
    this.app = app;
    app.ticker.add((ticker) => {
      if (this.currentScene) {
        this.currentScene.update(ticker.deltaTime);
      }
    });
  }

  public getApp(): Application {
    if (!this.app) throw new Error('SceneManager is not initialized with PIXI Application');
    return this.app;
  }

  public getScreenSize() {
    return {
      width: this.getApp().screen.width,
      height: this.getApp().screen.height
    };
  }

  public async switchScene(scene: BaseScene) {
    if (!this.app) throw new Error('SceneManager is not initialized');

    if (this.currentScene) {
      this.currentScene.stop();
      this.app.stage.removeChild(this.currentScene);
      this.currentScene.destroy({ children: true });
    }

    this.currentScene = scene;
    await this.currentScene.init();
    this.app.stage.addChild(this.currentScene);
    this.currentScene.start();
  }
}

export const SceneManager = new SceneManagerService();
