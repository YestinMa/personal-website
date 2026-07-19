import { SpriteAnimator } from "./SpriteAnimator";
import type { SpriteDefinition } from "./types";

export class SpriteTransitionController {
  private animationFrame = 0;
  private startedAt = 0;
  private elapsed = 0;
  private duration = 0;
  private swapped = false;
  private paused = false;
  private definition: SpriteDefinition | null = null;
  private onComplete: (() => void) | null = null;

  constructor(
    private readonly stage: HTMLElement,
    private readonly animator: SpriteAnimator,
  ) {}

  get active(): boolean {
    return this.definition !== null;
  }

  run(definition: SpriteDefinition, duration: number, onComplete: () => void): void {
    this.cancel();
    if (duration <= 0) {
      this.animator.setDefinition(definition);
      onComplete();
      return;
    }
    this.definition = definition;
    this.duration = duration;
    this.onComplete = onComplete;
    this.startedAt = performance.now();
    this.stage.classList.add("is-transitioning-out");
    this.animationFrame = window.requestAnimationFrame(this.tick);
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    if (this.animationFrame) window.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
    if (this.startedAt) this.elapsed += performance.now() - this.startedAt;
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    if (!this.definition) return;
    this.startedAt = performance.now();
    this.animationFrame = window.requestAnimationFrame(this.tick);
  }

  cancel(): void {
    if (this.animationFrame) window.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
    this.startedAt = 0;
    this.elapsed = 0;
    this.duration = 0;
    this.swapped = false;
    this.paused = false;
    this.definition = null;
    this.onComplete = null;
    this.stage.classList.remove("is-transitioning-out", "is-transitioning-in");
  }

  destroy(): void {
    this.cancel();
  }

  private readonly tick = (time: number): void => {
    if (this.paused || !this.definition) return;
    const progress = Math.min(1, (this.elapsed + time - this.startedAt) / this.duration);
    if (!this.swapped && progress >= 0.45) {
      this.swapped = true;
      this.animator.setDefinition(this.definition);
      this.stage.classList.remove("is-transitioning-out");
      this.stage.classList.add("is-transitioning-in");
    }
    if (progress >= 1) {
      const complete = this.onComplete;
      this.cancel();
      complete?.();
      return;
    }
    this.animationFrame = window.requestAnimationFrame(this.tick);
  };
}
