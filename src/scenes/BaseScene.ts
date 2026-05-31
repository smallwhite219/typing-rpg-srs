import { Container } from 'pixi.js';

export abstract class BaseScene extends Container {
  /**
   * Initializes the scene (e.g. creating UI elements, loading specific assets)
   */
  abstract init(): Promise<void> | void;

  /**
   * Called when the scene is about to be shown
   */
  abstract start(): void;

  /**
   * Called on every game loop tick
   * @param delta deltaTime from PixiJS ticker (in frames)
   */
  update(_delta: number): void {
    // Override if needed
  }

  /**
   * Called when the scene is being unloaded
   */
  abstract stop(): void;
}
