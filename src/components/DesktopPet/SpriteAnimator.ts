import type { SpriteDefinition } from "./types";

export class SpriteAnimator {
  private definition: SpriteDefinition;
  private frame = 0;
  private animationFrame = 0;
  private lastFrameTime = 0;
  private paused = false;

  constructor(private readonly element: HTMLElement, definition: SpriteDefinition) {
    this.definition = definition;
    this.applyDefinition();
  }

  get currentDefinition(): SpriteDefinition {
    return this.definition;
  }

  setDefinition(definition: SpriteDefinition): void {
    // 点击互动沿用当前 Sprite 时不重置帧，避免图片重新绑定造成闪烁。
    if (this.definition === definition) return;
    this.definition = definition;
    this.frame = 0;
    this.lastFrameTime = 0;
    this.applyDefinition();
  }

  start(): void {
    if (this.animationFrame || this.paused) return;
    this.animationFrame = window.requestAnimationFrame(this.tick);
  }

  pause(): void {
    this.paused = true;
    if (this.animationFrame) window.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.lastFrameTime = 0;
    this.start();
  }

  destroy(): void {
    if (this.animationFrame) window.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  private readonly tick = (time: number): void => {
    if (this.paused) return;
    const frameDuration = 1_000 / this.definition.fps;
    if (!this.lastFrameTime) this.lastFrameTime = time;
    if (time - this.lastFrameTime >= frameDuration) {
      const nextFrame = this.frame + 1;
      this.frame = this.definition.loop
        ? nextFrame % this.definition.frameCount
        : Math.min(nextFrame, this.definition.frameCount - 1);
      this.element.style.backgroundPosition = `${-this.frame * this.definition.frameWidth}px 0`;
      this.lastFrameTime = time;
    }
    this.animationFrame = window.requestAnimationFrame(this.tick);
  };

  private applyDefinition(): void {
    const { src, frameWidth, frameHeight, frameCount, visualScale, offsetX, offsetY } = this.definition;
    this.element.style.width = `${frameWidth}px`;
    this.element.style.height = `${frameHeight}px`;
    this.element.style.backgroundImage = `url("${src}")`;
    this.element.style.backgroundSize = `${frameWidth * frameCount}px ${frameHeight}px`;
    this.element.style.backgroundPosition = "0 0";
    this.element.style.setProperty("--sprite-visual-scale", String(visualScale));
    this.element.style.setProperty("--sprite-offset-x", `${offsetX}px`);
    this.element.style.setProperty("--sprite-offset-y", `${offsetY}px`);
  }
}
