import { SpriteAnimator } from "./SpriteAnimator";
import { bedBackSprite, bedFrontSprite, gazeSprite, heartSprite, petSprites } from "./petAssets";
import { petConfig } from "./petConfig";
import { PetMachine } from "./petMachine";
import type { Facing, PetConfig, PetState, SpriteDefinition } from "./types";

const randomBetween = (range: { readonly min: number; readonly max: number }): number =>
  range.min + Math.random() * (range.max - range.min);

const isMotionState = (state: PetState): boolean =>
  state === "leaveBed" || state === "walk" || state === "returnBed";

const isInBedState = (state: PetState): boolean =>
  state !== "leaveBed" && state !== "walk" && state !== "returnBed";

export class DesktopPet {
  private readonly machine = new PetMachine();
  private readonly root = document.createElement("div");
  private readonly bedBack = document.createElement("div");
  private readonly bedFront = document.createElement("button");
  private readonly actor = document.createElement("button");
  private readonly sprite = document.createElement("span");
  private readonly gaze = document.createElement("span");
  private readonly effectsLayer = document.createElement("div");
  private readonly dialogueLayer = document.createElement("div");
  private readonly dialogue = document.createElement("span");
  private readonly animator: SpriteAnimator;
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private readonly config: PetConfig;
  private readonly unsubscribe: () => void;

  private scale = 1;
  private bedX = 0;
  private bedY = 0;
  private actorX = 0;
  private actorY = 0;
  private facing: Facing = "left";
  private walkingDirection: -1 | 1 = -1;
  private stateTimer = 0;
  private timerDeadline = 0;
  private timerRemaining = 0;
  private timerCallback: (() => void) | null = null;
  private motionFrame = 0;
  private motionTime = 0;
  private gazeFrame = 0;
  private pointerX = -10_000;
  private pointerY = -10_000;
  private paused = document.hidden;
  private lastInteraction = performance.now();
  private sleepThreshold: number;
  private nextWalkAt: number;
  private lastReactionAt = -Infinity;

  constructor(config: PetConfig = petConfig) {
    this.config = config;
    this.sleepThreshold = randomBetween(config.sleepAfter);
    this.nextWalkAt = performance.now() + randomBetween(config.walkOpportunity);
    this.buildDom();
    this.animator = new SpriteAnimator(this.sprite, petSprites.idle);
    this.unsubscribe = this.machine.subscribe(({ previous, current }) => this.enterState(previous, current));
  }

  mount(parent: HTMLElement = document.body): void {
    if (document.querySelector("[data-desktop-pet]")) return;
    parent.append(this.root);
    this.updateLayout();
    this.addListeners();
    this.enterState("idle", "idle");
    if (this.paused) this.animator.pause();
    else this.animator.start();
  }

  destroy(): void {
    this.clearStateTimer();
    this.stopMotion();
    if (this.gazeFrame) window.cancelAnimationFrame(this.gazeFrame);
    this.animator.destroy();
    this.unsubscribe();
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("pointermove", this.handlePointerMove);
    document.removeEventListener("mouseleave", this.handlePointerLeave);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.reducedMotion.removeEventListener("change", this.handleMotionPreference);
    this.root.remove();
  }

  private buildDom(): void {
    this.root.className = "desktop-pet-root";
    this.root.dataset.desktopPet = "true";
    this.root.setAttribute("role", "group");
    this.root.setAttribute("aria-label", "像素柴犬网页桌宠");

    this.bedBack.className = "desktop-pet-bed desktop-pet-bed--back pixel-sprite";
    this.applyStaticSprite(this.bedBack, bedBackSprite);

    this.bedFront.type = "button";
    this.bedFront.className = "desktop-pet-bed desktop-pet-bed--front pixel-sprite";
    this.bedFront.setAttribute("aria-label", "和 Hotdog 小窝里的柴犬互动");
    this.applyStaticSprite(this.bedFront, bedFrontSprite);

    this.actor.type = "button";
    this.actor.className = "desktop-pet-actor";
    this.actor.setAttribute("aria-label", "和像素柴犬互动");
    this.sprite.className = "desktop-pet-sprite pixel-sprite";
    this.gaze.className = "desktop-pet-gaze pixel-sprite";
    this.gaze.style.backgroundImage = `url("${gazeSprite.src}")`;
    this.gaze.style.backgroundSize = `${gazeSprite.frameWidth * gazeSprite.frameCount}px ${gazeSprite.frameHeight}px`;
    this.actor.append(this.sprite, this.gaze, this.createEars());

    this.effectsLayer.className = "desktop-pet-effects";
    this.dialogueLayer.className = "desktop-pet-dialogue-layer";
    this.dialogue.className = "desktop-pet-dialogue";
    this.dialogue.setAttribute("role", "status");
    this.dialogueLayer.append(this.dialogue);
    this.root.append(this.bedBack, this.actor, this.bedFront, this.effectsLayer, this.dialogueLayer);
  }

  private createEars(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const leftEar = document.createElement("span");
    const rightEar = document.createElement("span");
    leftEar.className = "desktop-pet-ear desktop-pet-ear--left";
    rightEar.className = "desktop-pet-ear desktop-pet-ear--right";
    fragment.append(leftEar, rightEar);
    return fragment;
  }

  private addListeners(): void {
    this.actor.addEventListener("click", this.handleClick);
    this.bedFront.addEventListener("click", this.handleClick);
    this.actor.addEventListener("pointerenter", this.handlePointerEnter);
    this.actor.addEventListener("pointerleave", this.handlePointerExit);
    window.addEventListener("resize", this.handleResize, { passive: true });
    window.addEventListener("pointermove", this.handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", this.handlePointerLeave);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.reducedMotion.addEventListener("change", this.handleMotionPreference);
  }

  private readonly handleClick = (): void => {
    const now = performance.now();
    if (now - this.lastReactionAt < this.config.clickCooldown) return;
    this.recordInteraction(now);
    if (!this.machine.react()) return;
    this.lastReactionAt = now;
  };

  private readonly handlePointerEnter = (): void => this.actor.classList.add("is-hovered");
  private readonly handlePointerExit = (): void => this.actor.classList.remove("is-hovered");

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
    this.recordInteraction(performance.now());
    if (!this.gazeFrame && !this.paused) this.gazeFrame = window.requestAnimationFrame(this.renderGaze);
  };

  private readonly handlePointerLeave = (): void => {
    this.pointerX = -10_000;
    this.pointerY = -10_000;
    this.setGazeFrame(4);
  };

  private readonly handleResize = (): void => {
    this.updateLayout();
    if (!this.walkingEnabled() && (this.machine.state === "walk" || this.machine.state === "leaveBed")) {
      if (this.machine.state === "leaveBed") this.machine.transition("walk");
      this.machine.transition("returnBed");
    }
  };

  private readonly handleMotionPreference = (): void => this.handleResize();

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) this.pause();
    else this.resume();
  };

  private enterState(previous: PetState, current: PetState): void {
    this.clearStateTimer();
    this.stopMotion();
    this.root.dataset.petState = current;
    const animation = current === "react" && previous === "walk" ? petSprites.walk : petSprites[current];
    this.animator.setDefinition(animation);
    this.dialogue.classList.remove("is-visible");
    this.effectsLayer.replaceChildren();

    if (current !== "walk" && current !== "leaveBed" && current !== "returnBed") this.setFacing("right");
    if (isInBedState(current) && current !== "react") this.actorX = this.bedX;

    switch (current) {
      case "idle":
        this.scheduleState(() => this.finishIdle(), randomBetween(this.config.idleDuration));
        break;
      case "sit":
        this.scheduleState(() => this.finishSit(), randomBetween(this.config.sitDuration));
        break;
      case "sleep":
        this.scheduleState(() => this.machine.transition("wakeUp"), randomBetween(this.config.sleepDuration));
        break;
      case "wakeUp":
        this.scheduleState(() => this.machine.transition("idle"), this.config.wakeUpDuration);
        break;
      case "leaveBed":
        this.walkingDirection = -1;
        this.setFacing("left");
        this.startMotion();
        break;
      case "walk":
        this.scheduleState(() => this.machine.transition("returnBed"), randomBetween(this.config.walkDuration));
        this.startMotion();
        break;
      case "returnBed":
        this.startMotion();
        break;
      case "enterBed":
        this.actorX = this.bedX;
        this.renderPositions();
        this.scheduleState(() => this.machine.transition("idle"), this.config.enterBedDuration);
        break;
      case "react":
        if (previous !== "walk") this.actorX = this.bedX;
        this.showReaction();
        this.scheduleState(() => this.machine.finishReaction(), this.config.reactDuration);
        break;
    }

    this.renderGazeNow();
    this.renderPositions();
  }

  private finishIdle(): void {
    const now = performance.now();
    if (now - this.lastInteraction >= this.sleepThreshold) {
      this.machine.transition("sleep");
      return;
    }
    if (this.walkingEnabled() && now >= this.nextWalkAt) {
      this.nextWalkAt = now + randomBetween(this.config.walkOpportunity);
      if (Math.random() <= this.config.walkProbability) {
        this.machine.transition("leaveBed");
        return;
      }
    }
    this.machine.transition("sit");
  }

  private finishSit(): void {
    if (performance.now() - this.lastInteraction >= this.sleepThreshold) this.machine.transition("sleep");
    else this.machine.transition("idle");
  }

  private recordInteraction(now: number): void {
    this.lastInteraction = now;
    this.sleepThreshold = randomBetween(this.config.sleepAfter);
  }

  private showReaction(): void {
    const messageIndex = Math.floor(Math.random() * this.config.dialogue.length);
    this.dialogue.textContent = this.config.dialogue[messageIndex] ?? this.config.dialogue[0] ?? "汪！";
    this.dialogue.classList.add("is-visible");
    const heartCount = 2 + Math.floor(Math.random() * 3);
    for (let index = 0; index < heartCount; index += 1) {
      const heart = document.createElement("span");
      const frame = Math.floor(Math.random() * heartSprite.frameCount);
      heart.className = "desktop-pet-heart pixel-sprite";
      heart.style.left = `${80 + Math.random() * 105}px`;
      heart.style.top = `${24 + Math.random() * 24}px`;
      heart.style.animationDelay = `${index * 90}ms`;
      heart.style.backgroundImage = `url("${heartSprite.src}")`;
      heart.style.backgroundSize = `${heartSprite.frameWidth * heartSprite.frameCount}px ${heartSprite.frameHeight}px`;
      heart.style.backgroundPosition = `${-frame * heartSprite.frameWidth}px 0`;
      heart.addEventListener("animationend", () => heart.remove(), { once: true });
      this.effectsLayer.append(heart);
    }
  }

  private startMotion(): void {
    if (this.motionFrame || this.paused) return;
    this.motionTime = 0;
    this.motionFrame = window.requestAnimationFrame(this.move);
  }

  private stopMotion(): void {
    if (this.motionFrame) window.cancelAnimationFrame(this.motionFrame);
    this.motionFrame = 0;
    this.motionTime = 0;
  }

  private readonly move = (time: number): void => {
    if (this.paused) return;
    const delta = this.motionTime ? Math.min((time - this.motionTime) / 1_000, 0.05) : 0;
    this.motionTime = time;
    const state = this.machine.state;
    const speed = this.config.movementSpeed;
    const { left, right } = this.motionBounds();

    if (state === "leaveBed") {
      const target = Math.max(left, this.bedX - 110);
      this.actorX = Math.max(target, this.actorX - speed * delta);
      if (this.actorX <= target + 0.5) this.machine.transition("walk");
    } else if (state === "walk") {
      this.actorX += speed * this.walkingDirection * delta;
      if (this.actorX <= left) {
        this.actorX = left;
        this.walkingDirection = 1;
      } else if (this.actorX >= right) {
        this.actorX = right;
        this.walkingDirection = -1;
      }
      this.setFacing(this.walkingDirection < 0 ? "left" : "right");
    } else if (state === "returnBed") {
      const difference = this.bedX - this.actorX;
      this.setFacing(difference < 0 ? "left" : "right");
      const step = Math.sign(difference) * speed * 1.15 * delta;
      if (Math.abs(difference) <= Math.abs(step) + 1) {
        this.actorX = this.bedX;
        this.renderPositions();
        this.machine.transition("enterBed");
        return;
      }
      this.actorX += step;
    } else {
      return;
    }

    this.renderPositions();
    this.motionFrame = window.requestAnimationFrame(this.move);
  };

  private motionBounds(): { readonly left: number; readonly right: number } {
    const actorWidth = petSprites.walk.frameWidth * this.scale;
    return {
      left: this.config.walkingRange.leftInset,
      right: Math.max(this.config.walkingRange.leftInset, window.innerWidth - actorWidth - this.config.walkingRange.rightInset),
    };
  }

  private updateLayout(): void {
    const isMobile = window.innerWidth <= this.config.mobileBreakpoint;
    this.scale = isMobile
      ? this.config.mobileScale
      : window.innerWidth <= this.config.tabletBreakpoint
        ? this.config.tabletScale
        : this.config.scale;
    const right = isMobile ? this.config.mobileRight : this.config.right;
    const bottom = isMobile ? this.config.mobileBottom : this.config.bottom;
    this.bedX = Math.max(0, window.innerWidth - right - bedFrontSprite.frameWidth * this.scale);
    this.bedY = window.innerHeight - bottom - bedFrontSprite.frameHeight * this.scale;
    this.actorY = window.innerHeight - bottom - petSprites.idle.frameHeight * this.scale;

    if (isInBedState(this.machine.state)) this.actorX = this.bedX;
    else {
      const bounds = this.motionBounds();
      this.actorX = Math.min(bounds.right, Math.max(bounds.left, this.actorX));
    }
    this.renderPositions();
  }

  private renderPositions(): void {
    const bedTransform = `translate3d(${this.bedX}px, ${this.bedY}px, 0) scale(${this.scale})`;
    const actorTransform = `translate3d(${this.actorX}px, ${this.actorY}px, 0) scale(${this.scale})`;
    this.bedBack.style.transform = bedTransform;
    this.bedFront.style.transform = bedTransform;
    this.actor.style.transform = actorTransform;
    this.effectsLayer.style.transform = actorTransform;
    this.dialogueLayer.style.transform = actorTransform;
  }

  private setFacing(facing: Facing): void {
    this.facing = facing;
    this.sprite.classList.toggle("is-facing-left", facing === "left");
  }

  private readonly renderGaze = (): void => {
    this.gazeFrame = 0;
    this.renderGazeNow();
  };

  private renderGazeNow(): void {
    const state = this.machine.state;
    if (state !== "idle" && state !== "sit") {
      this.gaze.classList.remove("is-visible");
      return;
    }
    const headX = this.actorX + 174 * this.scale;
    const headY = this.actorY + (state === "sit" ? 42 : 52) * this.scale;
    const dx = this.pointerX - headX;
    const dy = this.pointerY - headY;
    if (Math.hypot(dx, dy) > this.config.gazeRadius) {
      this.setGazeFrame(4);
      return;
    }
    const column = dx < -28 ? 0 : dx > 28 ? 2 : 1;
    const row = dy < -24 ? 0 : dy > 24 ? 2 : 1;
    this.setGazeFrame(row * 3 + column);
  }

  private setGazeFrame(frame: number): void {
    this.gaze.style.backgroundPosition = `${-frame * gazeSprite.frameWidth}px 0`;
    this.gaze.classList.toggle("is-visible", this.machine.state === "idle" || this.machine.state === "sit");
  }

  private scheduleState(callback: () => void, delay: number): void {
    this.clearStateTimer();
    this.timerCallback = callback;
    this.timerRemaining = delay;
    this.timerDeadline = performance.now() + delay;
    if (this.paused) return;
    this.stateTimer = window.setTimeout(() => {
      this.stateTimer = 0;
      this.timerCallback = null;
      callback();
    }, delay);
  }

  private clearStateTimer(): void {
    if (this.stateTimer) window.clearTimeout(this.stateTimer);
    this.stateTimer = 0;
    this.timerCallback = null;
    this.timerRemaining = 0;
  }

  private pause(): void {
    if (this.paused) return;
    this.paused = true;
    if (this.stateTimer) {
      window.clearTimeout(this.stateTimer);
      this.stateTimer = 0;
      this.timerRemaining = Math.max(0, this.timerDeadline - performance.now());
    }
    this.stopMotion();
    if (this.gazeFrame) window.cancelAnimationFrame(this.gazeFrame);
    this.gazeFrame = 0;
    this.animator.pause();
  }

  private resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.animator.resume();
    if (this.timerCallback) {
      const callback = this.timerCallback;
      const remaining = this.timerRemaining;
      this.scheduleState(callback, remaining);
    }
    if (isMotionState(this.machine.state)) this.startMotion();
    this.renderGazeNow();
  }

  private walkingEnabled(): boolean {
    return window.innerWidth > this.config.mobileBreakpoint && !this.reducedMotion.matches;
  }

  private applyStaticSprite(element: HTMLElement, definition: SpriteDefinition): void {
    element.style.width = `${definition.frameWidth}px`;
    element.style.height = `${definition.frameHeight}px`;
    element.style.backgroundImage = `url("${definition.src}")`;
    element.style.backgroundSize = `${definition.frameWidth * definition.frameCount}px ${definition.frameHeight}px`;
  }
}

new DesktopPet().mount();
