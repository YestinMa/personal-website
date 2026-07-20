import { SpriteAnimator } from "./SpriteAnimator";
import { SpriteTransitionController } from "./SpriteTransitionController";
import {
  bedBackSprite,
  bedFrontSprite,
  bedReactSprite,
  dogLiftSprite,
  gazeSprite,
  heartSprite,
  petSprites,
  preloadPetAssets,
} from "./petAssets";
import { petConfig } from "./petConfig";
import { PetMachine } from "./petMachine";
import type { Facing, PetConfig, PetState, SpriteDefinition } from "./types";

type PetLocation = "bed" | "floor";
type DragPhase = "pending" | "active";

interface SuspendedTimer {
  readonly callback: () => void;
  readonly remaining: number;
}

interface DragData {
  phase: DragPhase;
  readonly pointerId: number;
  readonly captureElement: HTMLButtonElement;
  readonly startPointerX: number;
  readonly startPointerY: number;
  readonly startActorX: number;
  readonly startActorY: number;
  readonly startBedX: number;
  readonly startBedY: number;
  timer: SuspendedTimer | null;
}

interface FallAnimation {
  readonly target: "dog" | "bed" | "bedWithDog";
  readonly fromActorY: number;
  readonly fromBedY: number;
  readonly toActorY: number;
  readonly toBedY: number;
  readonly duration: number;
  readonly onComplete: () => void;
  elapsed: number;
  startedAt: number;
}

type DragSession =
  | { readonly type: "none" }
  | ({ readonly type: "draggingDog" } & DragData)
  | ({ readonly type: "draggingBed" } & DragData);

const randomBetween = (range: { readonly min: number; readonly max: number }): number =>
  range.min + Math.random() * (range.max - range.min);

const isMotionState = (state: PetState): boolean =>
  state === "leaveBed" || state === "walk" || state === "returnBed";

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export class DesktopPet {
  private readonly machine = new PetMachine();
  private readonly root = document.createElement("div");
  private readonly bedBack = document.createElement("div");
  private readonly bedVisualFront = document.createElement("div");
  private readonly bedFront = document.createElement("button");
  private readonly actor = document.createElement("button");
  private readonly spriteStage = document.createElement("span");
  private readonly sprite = document.createElement("span");
  private readonly gaze = document.createElement("span");
  private readonly effectsLayer = document.createElement("div");
  private readonly dialogueLayer = document.createElement("div");
  private readonly dialogue = document.createElement("span");
  private readonly dialogueHeart = document.createElement("span");
  private readonly animator: SpriteAnimator;
  private readonly transitionController: SpriteTransitionController;
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private readonly config: PetConfig;
  private readonly unsubscribe: () => void;

  private scale = 1;
  private bedX = 0;
  private bedY = 0;
  private actorX = 0;
  private actorY = 0;
  private facing: Facing = "right";
  private walkingDirection: -1 | 1 = -1;
  private petLocation: PetLocation = "bed";
  private dragSession: DragSession = { type: "none" };
  private layoutPasses = 0;
  private stateTimer = 0;
  private timerDeadline = 0;
  private timerRemaining = 0;
  private timerCallback: (() => void) | null = null;
  private motionFrame = 0;
  private motionTime = 0;
  private fallFrame = 0;
  private fallAnimation: FallAnimation | null = null;
  private gazeFrame = 0;
  private pointerX = -10_000;
  private pointerY = -10_000;
  private paused = document.hidden;
  private lastInteraction = performance.now();
  private sleepThreshold: number;
  private nextWalkAt: number;
  private lastReactionAt = -Infinity;
  private ignoreClickUntil = -Infinity;
  private walkBudgetRemaining = 0;
  private activeWalkSegmentDuration = 0;
  private destroyed = false;

  constructor(config: PetConfig = petConfig) {
    this.config = config;
    this.sleepThreshold = randomBetween(config.sleepAfter);
    this.nextWalkAt = performance.now() + randomBetween(config.walkOpportunity);
    this.buildDom();
    this.animator = new SpriteAnimator(this.sprite, petSprites.idle);
    this.transitionController = new SpriteTransitionController(this.spriteStage, this.animator);
    this.unsubscribe = this.machine.subscribe(({ previous, current }) => this.enterState(previous, current));
  }

  mount(parent: HTMLElement = document.body): void {
    if (document.querySelector("[data-desktop-pet]")) return;
    this.root.dataset.assetStatus = "loading";
    parent.append(this.root);
    this.updateLayout();
    this.addListeners();
    void this.initializeAfterAssetsReady();
  }

  destroy(): void {
    this.destroyed = true;
    this.clearStateTimer();
    this.stopMotion();
    this.pauseFall();
    this.cancelFall();
    if (this.gazeFrame) window.cancelAnimationFrame(this.gazeFrame);
    this.animator.destroy();
    this.transitionController.destroy();
    this.unsubscribe();
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("pointermove", this.handlePointerMove);
    document.removeEventListener("mouseleave", this.handlePointerLeave);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.reducedMotion.removeEventListener("change", this.handleMotionPreference);
    this.root.remove();
  }

  private async initializeAfterAssetsReady(): Promise<void> {
    const failures = await preloadPetAssets();
    // 预加载期间组件可能已被销毁，异步完成后不得重新注册行为或启动动画。
    if (this.destroyed) return;
    if (failures.length > 0) {
      this.root.dataset.assetStatus = "error";
      failures.forEach(({ src, error }) => console.error(`桌宠素材预加载失败：${src}`, error));
    } else {
      this.root.dataset.assetStatus = "ready";
    }
    this.enterState("idle", "idle");
    if (this.paused) this.animator.pause();
    else this.animator.start();
  }

  private buildDom(): void {
    this.root.className = "desktop-pet-root";
    this.root.dataset.desktopPet = "true";
    this.root.style.setProperty("--pet-transition-half", `${this.config.transitionDuration / 2}ms`);
    this.root.style.setProperty("--pet-release-duration", `${this.config.dragReleaseDuration}ms`);
    this.root.setAttribute("role", "group");
    this.root.setAttribute("aria-label", "可互动、可拖动的像素柴犬网页桌宠");

    this.bedBack.className = "desktop-pet-bed desktop-pet-bed--back pixel-sprite";
    this.applyStaticSprite(this.bedBack, bedBackSprite);
    // 狗窝与文字已合成在单张底层素材中，避免两张轮廓叠加产生侧边黑色接缝。

    this.bedVisualFront.className = "desktop-pet-bed desktop-pet-bed--visual-front pixel-sprite";
    this.applyStaticSprite(this.bedVisualFront, bedFrontSprite);

    this.bedFront.type = "button";
    this.bedFront.className = "desktop-pet-bed desktop-pet-bed--front";
    this.bedFront.setAttribute("aria-label", "拖动 Hotdog 柴犬小窝");
    this.bedFront.style.width = `${bedFrontSprite.frameWidth}px`;
    this.bedFront.style.height = `${bedFrontSprite.frameHeight}px`;

    this.actor.type = "button";
    this.actor.className = "desktop-pet-actor";
    this.actor.setAttribute("aria-label", "和像素柴犬互动或拖动柴犬");
    this.spriteStage.className = "desktop-pet-sprite-stage";
    this.sprite.className = "desktop-pet-sprite pixel-sprite";
    this.gaze.className = "desktop-pet-gaze pixel-sprite";
    this.gaze.style.backgroundImage = `url("${gazeSprite.src}")`;
    this.gaze.style.backgroundSize = `${gazeSprite.frameWidth * gazeSprite.frameCount}px ${gazeSprite.frameHeight}px`;
    this.spriteStage.append(this.sprite, this.gaze);
    this.actor.append(this.spriteStage);

    this.effectsLayer.className = "desktop-pet-effects";
    this.dialogueLayer.className = "desktop-pet-dialogue-layer";
    this.dialogue.className = "desktop-pet-dialogue";
    this.dialogue.setAttribute("role", "status");
    this.dialogue.setAttribute("aria-label", "柴犬很开心");
    this.dialogueHeart.className = "desktop-pet-dialogue-heart pixel-sprite";
    this.dialogueHeart.style.backgroundImage = `url("${heartSprite.src}")`;
    const dialogueHeartScale = 0.5;
    this.dialogueHeart.style.backgroundSize = `${heartSprite.frameWidth * heartSprite.frameCount * dialogueHeartScale}px ${heartSprite.frameHeight * dialogueHeartScale}px`;
    this.dialogueHeart.style.backgroundPosition = `${-2 * heartSprite.frameWidth * dialogueHeartScale}px 0`;
    this.dialogue.append(this.dialogueHeart);
    this.dialogueLayer.append(this.dialogue);
    this.root.append(
      this.bedBack,
      this.actor,
      this.bedVisualFront,
      this.effectsLayer,
      this.dialogueLayer,
      this.bedFront,
    );
  }

  private addListeners(): void {
    this.actor.addEventListener("click", this.handleActorClick);
    this.bedFront.addEventListener("click", this.handleBedClick);
    this.actor.addEventListener("pointerdown", this.handleDogPointerDown);
    this.bedFront.addEventListener("pointerdown", this.handleBedPointerDown);
    this.root.addEventListener("pointermove", this.handleDragMove);
    this.root.addEventListener("pointerup", this.handleDragEnd);
    this.root.addEventListener("pointercancel", this.handleDragCancel);
    this.actor.addEventListener("pointerenter", this.handlePointerEnter);
    this.actor.addEventListener("pointerleave", this.handlePointerExit);
    window.addEventListener("resize", this.handleResize, { passive: true });
    window.addEventListener("pointermove", this.handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", this.handlePointerLeave);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.reducedMotion.addEventListener("change", this.handleMotionPreference);
  }

  private readonly handleActorClick = (): void => this.triggerReaction();

  private readonly handleBedClick = (): void => {
    if (this.petLocation === "bed") this.triggerReaction();
  };

  private triggerReaction(): void {
    const now = performance.now();
    if (now < this.ignoreClickUntil || now - this.lastReactionAt < this.config.clickCooldown) return;
    this.recordInteraction(now);
    const returnState = this.petLocation === "floor" ? "floorRest" : undefined;
    if (!this.machine.react(returnState)) return;
    this.lastReactionAt = now;
  }

  private readonly handleDogPointerDown = (event: PointerEvent): void => this.beginDrag("draggingDog", event);
  private readonly handleBedPointerDown = (event: PointerEvent): void => this.beginDrag("draggingBed", event);

  private beginDrag(type: "draggingDog" | "draggingBed", event: PointerEvent): void {
    if (event.button !== 0 || this.dragSession.type !== "none" || this.transitionController.active || this.fallAnimation) return;
    event.preventDefault();
    const captureElement = type === "draggingDog" ? this.actor : this.bedFront;
    captureElement.setPointerCapture(event.pointerId);
    const data: DragData = {
      phase: "pending",
      pointerId: event.pointerId,
      captureElement,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startActorX: this.actorX,
      startActorY: this.actorY,
      startBedX: this.bedX,
      startBedY: this.bedY,
      timer: null,
    };
    this.dragSession = type === "draggingDog" ? { type, ...data } : { type, ...data };
  }

  private readonly handleDragMove = (event: PointerEvent): void => {
    const session = this.dragSession;
    if (session.type === "none" || event.pointerId !== session.pointerId) return;
    const deltaX = event.clientX - session.startPointerX;
    const deltaY = event.clientY - session.startPointerY;
    if (session.phase === "pending") {
      if (Math.hypot(deltaX, deltaY) < this.config.dragThreshold) return;
      session.phase = "active";
      this.root.dataset.dragTarget = session.type === "draggingDog" ? "dog" : "bed";
      if (session.type === "draggingDog") {
        session.timer = this.suspendStateTimer();
        this.stopMotion();
        this.transitionController.pause();
        // 拖狗使用独立悬空 Sprite，不复用站立或行走帧。
        this.animator.setDefinition(dogLiftSprite);
      }
    }

    if (session.type === "draggingDog") {
      const bounds = this.actorDragBounds();
      this.actorX = clamp(session.startActorX + deltaX, bounds.left, bounds.right);
      this.actorY = clamp(session.startActorY + deltaY, bounds.top, bounds.bottom);
    } else {
      const bounds = this.bedDragBounds();
      this.bedX = clamp(session.startBedX + deltaX, bounds.left, bounds.right);
      this.bedY = clamp(session.startBedY + deltaY, bounds.top, bounds.bottom);
      if (this.petLocation === "bed") this.alignActorWithBed();
    }
    this.renderPositions();
  };

  private readonly handleDragEnd = (event: PointerEvent): void => {
    const session = this.dragSession;
    if (session.type === "none" || event.pointerId !== session.pointerId) return;
    this.releasePointerCapture(session);
    delete this.root.dataset.dragTarget;

    if (session.phase === "pending") {
      this.dragSession = { type: "none" };
      return;
    }

    this.ignoreClickUntil = performance.now() + this.config.clickCooldown;
    this.dragSession = { type: "none" };
    if (session.type === "draggingBed") {
      const fallTarget = this.petLocation === "bed" ? "bedWithDog" : "bed";
      this.startFall(fallTarget, () => this.resumeSuspendedBehavior(session.timer));
      return;
    }

    // 松手后柴犬已脱离狗窝；必须在首个下落帧前关闭窝内裁切，避免下半身闪隐。
    this.petLocation = "floor";
    this.renderPositions();
    this.startFall("dog", () => this.finishDogDrop());
  };

  private readonly handleDragCancel = (event: PointerEvent): void => {
    const session = this.dragSession;
    if (session.type === "none" || event.pointerId !== session.pointerId) return;
    this.releasePointerCapture(session);
    if (session.type === "draggingDog") {
      this.actorX = session.startActorX;
      this.actorY = session.startActorY;
    } else {
      // 拖窝期间窝外柴犬仍在行动，取消拖拽时只还原窝，不能把狗传送回起点。
      this.bedX = session.startBedX;
      this.bedY = session.startBedY;
      if (this.petLocation === "bed") this.alignActorWithBed();
    }
    this.ignoreClickUntil = performance.now() + this.config.clickCooldown;
    this.dragSession = { type: "none" };
    delete this.root.dataset.dragTarget;
    if (session.phase === "active" && session.type === "draggingDog") this.restoreCurrentSprite();
    this.renderPositions();
    this.resumeSuspendedBehavior(session.timer);
  };

  private releasePointerCapture(session: Exclude<DragSession, { readonly type: "none" }>): void {
    if (session.captureElement.hasPointerCapture(session.pointerId)) {
      session.captureElement.releasePointerCapture(session.pointerId);
    }
  }

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
    if (!this.walkingEnabled() && (
      this.machine.state === "walk"
      || this.machine.state === "floorRest"
      || this.machine.state === "leaveBed"
    )) {
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
    if (previous === "walk") this.consumeActiveWalkSegment();
    this.clearStateTimer();
    this.stopMotion();
    this.transitionController.cancel();
    this.root.dataset.petState = current;
    this.dialogue.classList.remove("is-visible");
    this.effectsLayer.replaceChildren();

    if (current === "leaveBed") {
      this.walkingDirection = -1;
      this.setFacing("left");
    } else if (current === "walk") {
      this.setFacing(this.walkingDirection < 0 ? "left" : "right");
    } else if (current !== "floorRest" && current !== "returnBed" && current !== "react") {
      this.setFacing("right");
    }

    if (current === "idle" || current === "sit" || current === "sleep" || current === "wakeUp" || current === "enterBed") {
      this.petLocation = "bed";
      this.alignActorWithBed();
    } else if (current === "leaveBed" || current === "walk" || current === "floorRest" || current === "returnBed") {
      this.petLocation = "floor";
    }

    this.renderGazeNow();
    this.renderPositions();

    const animation = this.spriteForState(current);
    if (current === "react") {
      // 点击后同步停止行走帧并换成开心 Sprite，避免在原地继续播放步态。
      this.animator.setDefinition(animation);
      this.showReaction();
      this.beginStateBehavior(previous, current);
      return;
    }

    const transitionDuration = previous === current || this.reducedMotion.matches
      ? 0
      : this.config.transitionDuration;
    this.transitionController.run(animation, transitionDuration, () => this.beginStateBehavior(previous, current));
  }

  private beginStateBehavior(previous: PetState, current: PetState): void {
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
        this.walkBudgetRemaining = randomBetween(this.config.walkDuration);
        this.startMotion();
        break;
      case "walk": {
        if (this.walkBudgetRemaining <= 0) this.walkBudgetRemaining = randomBetween(this.config.walkDuration);
        this.activeWalkSegmentDuration = Math.min(
          this.walkBudgetRemaining,
          randomBetween(this.config.walkSegmentDuration),
        );
        this.scheduleState(() => this.finishWalkSegment(), this.activeWalkSegmentDuration);
        this.startMotion();
        break;
      }
      case "floorRest":
        this.scheduleState(() => this.finishFloorRest(), randomBetween(this.config.floorRestDuration));
        break;
      case "returnBed":
        this.walkBudgetRemaining = 0;
        this.activeWalkSegmentDuration = 0;
        this.startMotion();
        break;
      case "enterBed":
        this.scheduleState(() => this.machine.transition("idle"), this.config.enterBedDuration);
        break;
      case "react":
        this.scheduleState(() => this.machine.finishReaction(), this.config.reactDuration);
        break;
    }
  }

  private consumeActiveWalkSegment(): void {
    if (this.activeWalkSegmentDuration <= 0) return;
    const remaining = this.currentTimerRemaining() ?? 0;
    const elapsed = Math.max(0, this.activeWalkSegmentDuration - remaining);
    this.walkBudgetRemaining = Math.max(0, this.walkBudgetRemaining - elapsed);
    this.activeWalkSegmentDuration = 0;
  }

  private finishWalkSegment(): void {
    this.walkBudgetRemaining = Math.max(0, this.walkBudgetRemaining - this.activeWalkSegmentDuration);
    this.activeWalkSegmentDuration = 0;
    if (this.walkBudgetRemaining <= 0) this.machine.transition("returnBed");
    else this.machine.transition("floorRest");
  }

  private finishFloorRest(): void {
    if (this.walkBudgetRemaining > 0 && this.walkingEnabled()) this.machine.transition("walk");
    else this.machine.transition("returnBed");
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
    if (this.motionFrame || this.paused || this.dragSession.type === "draggingDog") return;
    this.motionTime = 0;
    this.motionFrame = window.requestAnimationFrame(this.move);
  }

  private stopMotion(): void {
    if (this.motionFrame) window.cancelAnimationFrame(this.motionFrame);
    this.motionFrame = 0;
    this.motionTime = 0;
  }

  private startFall(target: FallAnimation["target"], onComplete: () => void): void {
    this.cancelFall();
    const actorGroundY = this.actorBounds().bottom;
    const bedGroundY = this.bedBounds().bottom;
    const toActorY = target === "bedWithDog" ? bedGroundY - (petSprites.idle.frameHeight - bedFrontSprite.frameHeight) * this.scale : actorGroundY;
    const toBedY = bedGroundY;
    const actorDistance = target === "bed" ? 0 : Math.max(0, toActorY - this.actorY);
    const bedDistance = target === "dog" ? 0 : Math.max(0, toBedY - this.bedY);

    if (this.reducedMotion.matches || Math.max(actorDistance, bedDistance) < 1) {
      if (target !== "bed") this.actorY = toActorY;
      if (target !== "dog") this.bedY = toBedY;
      if (target === "bedWithDog") this.alignActorWithBed();
      this.renderPositions();
      this.finishFall(target, onComplete);
      return;
    }

    // 位置由 rAF 逐帧计算，二次曲线模拟重力加速；最终停点始终是底部地面线。
    this.fallAnimation = {
      target,
      fromActorY: this.actorY,
      fromBedY: this.bedY,
      toActorY,
      toBedY,
      duration: this.config.fallDuration,
      onComplete,
      elapsed: 0,
      startedAt: performance.now(),
    };
    this.root.dataset.fallTarget = target;
    this.fallFrame = window.requestAnimationFrame(this.fall);
  }

  private readonly fall = (time: number): void => {
    const animation = this.fallAnimation;
    if (!animation || this.paused) return;
    const progress = Math.min(1, (animation.elapsed + time - animation.startedAt) / animation.duration);
    const gravityProgress = progress * progress;
    if (animation.target !== "bed") {
      this.actorY = animation.fromActorY + (animation.toActorY - animation.fromActorY) * gravityProgress;
    }
    if (animation.target !== "dog") {
      this.bedY = animation.fromBedY + (animation.toBedY - animation.fromBedY) * gravityProgress;
      if (animation.target === "bedWithDog") this.alignActorWithBed();
    }
    this.renderPositions();
    if (progress >= 1) {
      this.fallFrame = 0;
      this.fallAnimation = null;
      delete this.root.dataset.fallTarget;
      this.finishFall(animation.target, animation.onComplete);
      return;
    }
    this.fallFrame = window.requestAnimationFrame(this.fall);
  };

  private finishFall(target: FallAnimation["target"], onComplete: () => void): void {
    // 狗窝依靠重力轨迹直接落地，不再叠加旋转和二次回弹；只有单独放狗时保留落地缓冲。
    if (target === "dog") this.playDogReleaseAnimation();
    onComplete();
  }

  private finishDogDrop(): void {
    this.petLocation = "floor";
    if (this.isDogAtBedEntrance()) {
      this.alignActorWithBed();
      this.petLocation = "bed";
      this.machine.drop("enterBed");
    } else if (this.walkingEnabled()) {
      this.walkingDirection = this.facing === "left" ? -1 : 1;
      this.machine.drop("walk");
    } else {
      this.machine.drop("returnBed");
    }
  }

  private cancelFall(): void {
    if (this.fallFrame) window.cancelAnimationFrame(this.fallFrame);
    this.fallFrame = 0;
    this.fallAnimation = null;
    delete this.root.dataset.fallTarget;
  }

  private pauseFall(): void {
    const animation = this.fallAnimation;
    if (!animation) return;
    if (this.fallFrame) window.cancelAnimationFrame(this.fallFrame);
    this.fallFrame = 0;
    animation.elapsed += performance.now() - animation.startedAt;
  }

  private resumeFall(): void {
    const animation = this.fallAnimation;
    if (!animation || this.fallFrame) return;
    animation.startedAt = performance.now();
    this.fallFrame = window.requestAnimationFrame(this.fall);
  }

  private readonly move = (time: number): void => {
    if (this.paused || this.dragSession.type === "draggingDog") return;
    const delta = this.motionTime ? Math.min((time - this.motionTime) / 1_000, 0.05) : 0;
    this.motionTime = time;
    const state = this.machine.state;
    const speed = this.config.movementSpeed;
    const bounds = this.actorBounds();

    if (state === "leaveBed") {
      const target = Math.max(bounds.left, this.bedX - 110);
      this.actorX = Math.max(target, this.actorX - speed * delta);
      if (this.actorX <= target + 0.5) this.machine.transition("walk");
    } else if (state === "walk") {
      this.actorX += speed * this.walkingDirection * delta;
      if (this.actorX <= bounds.left) {
        this.actorX = bounds.left;
        this.walkingDirection = 1;
      } else if (this.actorX >= bounds.right) {
        this.actorX = bounds.right;
        this.walkingDirection = -1;
      }
      this.setFacing(this.walkingDirection < 0 ? "left" : "right");
    } else if (state === "returnBed") {
      const targetX = this.bedX;
      const targetY = this.bedActorY();
      const differenceX = targetX - this.actorX;
      const differenceY = targetY - this.actorY;
      const distance = Math.hypot(differenceX, differenceY);
      const step = speed * 1.15 * delta;
      this.setFacing(differenceX < 0 ? "left" : "right");
      if (distance <= step + 1) {
        this.actorX = targetX;
        this.actorY = targetY;
        this.renderPositions();
        this.machine.transition("enterBed");
        return;
      }
      if (distance > 0) {
        this.actorX += differenceX / distance * step;
        this.actorY += differenceY / distance * step;
      }
    } else {
      return;
    }

    this.renderPositions();
    this.motionFrame = window.requestAnimationFrame(this.move);
  };

  private updateLayout(): void {
    const isMobile = window.innerWidth <= this.config.mobileBreakpoint;
    this.scale = isMobile
      ? this.config.mobileScale
      : window.innerWidth <= this.config.tabletBreakpoint
        ? this.config.tabletScale
        : this.config.scale;
    const right = isMobile ? this.config.mobileRight : this.config.right;
    const bottom = isMobile ? this.config.mobileBottom : this.config.bottom;
    const defaultBedX = window.innerWidth - right - bedFrontSprite.frameWidth * this.scale;
    const defaultBedY = window.innerHeight - bottom - bedFrontSprite.frameHeight * this.scale;

    if (this.layoutPasses === 0) {
      this.bedX = Math.max(0, defaultBedX);
      this.bedY = defaultBedY;
      this.alignActorWithBed();
    } else {
      const bedBounds = this.bedBounds();
      this.bedX = clamp(this.bedX, bedBounds.left, bedBounds.right);
      this.bedY = clamp(this.bedY, bedBounds.top, bedBounds.bottom);
      if (this.petLocation === "bed") this.alignActorWithBed();
      else {
        const actorBounds = this.actorBounds();
        this.actorX = clamp(this.actorX, actorBounds.left, actorBounds.right);
        this.actorY = clamp(this.actorY, actorBounds.top, actorBounds.bottom);
      }
    }
    this.layoutPasses += 1;
    this.renderPositions();
  }

  private actorBounds(): { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number } {
    const isMobile = window.innerWidth <= this.config.mobileBreakpoint;
    const bottomInset = isMobile ? this.config.mobileBottom : this.config.bottom;
    const width = petSprites.walk.frameWidth * this.scale;
    const height = petSprites.walk.frameHeight * this.scale;
    const bottom = window.innerHeight - bottomInset - height;
    return {
      left: this.config.walkingRange.leftInset,
      right: Math.max(this.config.walkingRange.leftInset, window.innerWidth - width - this.config.walkingRange.rightInset),
      top: bottom,
      bottom,
    };
  }

  private actorDragBounds(): { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number } {
    const ground = this.actorBounds();
    return { ...ground, top: Math.max(0, ground.bottom - this.config.dragVerticalRange) };
  }

  private bedBounds(): { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number } {
    const isMobile = window.innerWidth <= this.config.mobileBreakpoint;
    const bottomInset = isMobile ? this.config.mobileBottom : this.config.bottom;
    const width = bedFrontSprite.frameWidth * this.scale;
    const height = bedFrontSprite.frameHeight * this.scale;
    const bottom = window.innerHeight - bottomInset - height;
    return {
      left: this.config.walkingRange.leftInset,
      right: Math.max(this.config.walkingRange.leftInset, window.innerWidth - width - this.config.walkingRange.rightInset),
      top: bottom,
      bottom,
    };
  }

  private bedDragBounds(): { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number } {
    const ground = this.bedBounds();
    return { ...ground, top: Math.max(0, ground.bottom - this.config.dragVerticalRange) };
  }

  private bedActorY(): number {
    return this.bedY - (petSprites.idle.frameHeight - bedFrontSprite.frameHeight) * this.scale;
  }

  private alignActorWithBed(): void {
    this.actorX = this.bedX;
    this.actorY = this.bedActorY();
  }

  private isDogAtBedEntrance(): boolean {
    return Math.hypot(this.actorX - this.bedX, this.actorY - this.bedActorY()) <= this.config.bedEntryRadius * this.scale;
  }

  private renderPositions(): void {
    const bedTransform = `translate3d(${this.bedX}px, ${this.bedY}px, 0) scale(${this.scale})`;
    const actorTransform = `translate3d(${this.actorX}px, ${this.actorY}px, 0) scale(${this.scale})`;
    this.bedBack.style.transform = bedTransform;
    this.bedVisualFront.style.transform = bedTransform;
    this.bedFront.style.transform = bedTransform;
    this.actor.style.transform = actorTransform;
    this.effectsLayer.style.transform = actorTransform;
    this.dialogueLayer.style.transform = actorTransform;
    this.root.dataset.petLocation = this.petLocation;
  }

  private restoreCurrentSprite(): void {
    this.animator.setDefinition(this.spriteForState(this.machine.state));
  }

  private spriteForState(state: PetState): SpriteDefinition {
    if (state === "react" && this.petLocation === "bed") return bedReactSprite;
    return petSprites[state];
  }

  private setFacing(facing: Facing): void {
    this.facing = facing;
    this.sprite.style.setProperty("--sprite-facing", facing === "left" ? "-1" : "1");
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
    const deltaX = this.pointerX - headX;
    const deltaY = this.pointerY - headY;
    if (Math.hypot(deltaX, deltaY) > this.config.gazeRadius) {
      this.setGazeFrame(4);
      return;
    }
    const column = deltaX < -28 ? 0 : deltaX > 28 ? 2 : 1;
    const row = deltaY < -24 ? 0 : deltaY > 24 ? 2 : 1;
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
    if (this.paused || this.dragSession.type === "draggingDog") return;
    this.stateTimer = window.setTimeout(() => {
      this.stateTimer = 0;
      this.timerCallback = null;
      callback();
    }, delay);
  }

  private currentTimerRemaining(): number | null {
    if (!this.timerCallback) return null;
    return this.stateTimer ? Math.max(0, this.timerDeadline - performance.now()) : this.timerRemaining;
  }

  private suspendStateTimer(): SuspendedTimer | null {
    if (!this.timerCallback) return null;
    const snapshot = {
      callback: this.timerCallback,
      remaining: this.currentTimerRemaining() ?? 0,
    };
    if (this.stateTimer) window.clearTimeout(this.stateTimer);
    this.stateTimer = 0;
    this.timerCallback = null;
    this.timerRemaining = 0;
    return snapshot;
  }

  private resumeSuspendedBehavior(timer: SuspendedTimer | null): void {
    this.transitionController.resume();
    if (timer) this.scheduleState(timer.callback, timer.remaining);
    if (!this.transitionController.active && isMotionState(this.machine.state)) this.startMotion();
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
    this.root.dataset.paused = "true";
    if (this.stateTimer) {
      window.clearTimeout(this.stateTimer);
      this.stateTimer = 0;
      this.timerRemaining = Math.max(0, this.timerDeadline - performance.now());
    }
    this.stopMotion();
    this.pauseFall();
    if (this.gazeFrame) window.cancelAnimationFrame(this.gazeFrame);
    this.gazeFrame = 0;
    this.animator.pause();
    this.transitionController.pause();
  }

  private resume(): void {
    if (!this.paused) return;
    this.paused = false;
    delete this.root.dataset.paused;
    this.animator.resume();
    this.resumeFall();
    if (this.dragSession.type !== "draggingDog") this.transitionController.resume();
    if (this.timerCallback) {
      const callback = this.timerCallback;
      const remaining = this.timerRemaining;
      this.scheduleState(callback, remaining);
    }
    if (!this.transitionController.active && isMotionState(this.machine.state)) this.startMotion();
    this.renderGazeNow();
  }

  private playDogReleaseAnimation(): void {
    if (this.reducedMotion.matches) return;
    this.spriteStage.classList.remove("is-settling");
    void this.spriteStage.offsetWidth;
    this.spriteStage.classList.add("is-settling");
    this.spriteStage.addEventListener("animationend", () => this.spriteStage.classList.remove("is-settling"), { once: true });
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
