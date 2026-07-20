var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// ../src/components/DesktopPet/SpriteAnimator.ts
var SpriteAnimator = class {
  constructor(element, definition) {
    this.element = element;
    __publicField(this, "definition");
    __publicField(this, "frame", 0);
    __publicField(this, "animationFrame", 0);
    __publicField(this, "lastFrameTime", 0);
    __publicField(this, "paused", false);
    __publicField(this, "tick", (time) => {
      if (this.paused) return;
      const frameDuration = 1e3 / this.definition.fps;
      if (!this.lastFrameTime) this.lastFrameTime = time;
      if (time - this.lastFrameTime >= frameDuration) {
        const nextFrame = this.frame + 1;
        this.frame = this.definition.loop ? nextFrame % this.definition.frameCount : Math.min(nextFrame, this.definition.frameCount - 1);
        this.element.style.backgroundPosition = `${-this.frame * this.definition.frameWidth}px 0`;
        this.lastFrameTime = time;
      }
      this.animationFrame = window.requestAnimationFrame(this.tick);
    });
    this.definition = definition;
    this.applyDefinition();
  }
  get currentDefinition() {
    return this.definition;
  }
  setDefinition(definition) {
    if (this.definition === definition) return;
    this.definition = definition;
    this.frame = 0;
    this.lastFrameTime = 0;
    this.applyDefinition();
  }
  start() {
    if (this.animationFrame || this.paused) return;
    this.animationFrame = window.requestAnimationFrame(this.tick);
  }
  pause() {
    this.paused = true;
    if (this.animationFrame) window.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }
  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.lastFrameTime = 0;
    this.start();
  }
  destroy() {
    if (this.animationFrame) window.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }
  applyDefinition() {
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
};

// ../src/components/DesktopPet/SpriteTransitionController.ts
var SpriteTransitionController = class {
  constructor(stage, animator) {
    this.stage = stage;
    this.animator = animator;
    __publicField(this, "animationFrame", 0);
    __publicField(this, "startedAt", 0);
    __publicField(this, "elapsed", 0);
    __publicField(this, "duration", 0);
    __publicField(this, "swapped", false);
    __publicField(this, "paused", false);
    __publicField(this, "definition", null);
    __publicField(this, "onComplete", null);
    __publicField(this, "tick", (time) => {
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
    });
  }
  get active() {
    return this.definition !== null;
  }
  run(definition, duration, onComplete) {
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
  pause() {
    if (this.paused) return;
    this.paused = true;
    if (this.animationFrame) window.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
    if (this.startedAt) this.elapsed += performance.now() - this.startedAt;
  }
  resume() {
    if (!this.paused) return;
    this.paused = false;
    if (!this.definition) return;
    this.startedAt = performance.now();
    this.animationFrame = window.requestAnimationFrame(this.tick);
  }
  cancel() {
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
  destroy() {
    this.cancel();
  }
};

// ../src/components/DesktopPet/petAssets.ts
var petAssetVersion = "1.6.0";
var petAsset = (fileName) => new URL(`../images/pet/${fileName}?v=${petAssetVersion}`, import.meta.url).href;
var petSprite = (fileName, fps, loop = true, offsetY = -18) => ({
  src: petAsset(fileName),
  frameWidth: 256,
  frameHeight: 160,
  frameCount: 4,
  fps,
  loop,
  anchorX: 0.5,
  anchorY: 1,
  visualScale: 1,
  offsetX: 0,
  offsetY
});
var petSprites = {
  // 窝内帧统一落在前沿上边界，避免身体和 hot dog 字样互相穿插。
  idle: petSprite("shiba-idle.png", 2.4, true, -34),
  sit: petSprite("shiba-sit.png", 2.2, true, -34),
  sleep: petSprite("shiba-sleep.png", 1.6, true, -34),
  wakeUp: petSprite("shiba-wake.png", 4, false, -34),
  leaveBed: petSprite("shiba-walk-v2.png", 7),
  walk: petSprite("shiba-walk-v2.png", 8, true, 0),
  floorRest: {
    ...petSprite("shiba-idle.png", 2.4, true, 0),
    visualScale: 0.95
  },
  returnBed: petSprite("shiba-walk-v2.png", 8, true, 0),
  enterBed: petSprite("shiba-wake.png", 4, false, -34),
  react: petSprite("shiba-react.png", 5, true, 0)
};
var dogLiftSprite = petSprite("shiba-lift.png", 6, true, 0);
var bedReactSprite = petSprite("shiba-react.png", 5, true, -34);
var bedBackSprite = {
  src: petAsset("bed-back.png"),
  frameWidth: 256,
  frameHeight: 128,
  frameCount: 1,
  fps: 1,
  loop: false,
  anchorX: 0.5,
  anchorY: 1,
  visualScale: 1,
  offsetX: 0,
  offsetY: 0
};
var bedFrontSprite = {
  ...bedBackSprite,
  src: petAsset("bed-front-low.png")
};
var gazeSprite = {
  src: petAsset("gaze.png"),
  frameWidth: 12,
  frameHeight: 6,
  frameCount: 9,
  fps: 1,
  loop: false,
  anchorX: 0.5,
  anchorY: 0.5,
  visualScale: 1,
  offsetX: 0,
  offsetY: 0
};
var heartSprite = {
  src: petAsset("effects-hearts.png"),
  frameWidth: 64,
  frameHeight: 64,
  frameCount: 4,
  fps: 1,
  loop: false,
  anchorX: 0.5,
  anchorY: 0.5,
  visualScale: 1,
  offsetX: 0,
  offsetY: 0
};
var allSpriteDefinitions = [
  ...Object.values(petSprites),
  dogLiftSprite,
  bedReactSprite,
  bedBackSprite,
  bedFrontSprite,
  gazeSprite,
  heartSprite
];
var petAssetSources = [...new Set(allSpriteDefinitions.map(({ src }) => src))];
var loadAndDecodeImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.addEventListener("load", () => {
    image.decode().then(resolve, () => reject(new Error(`\u684C\u5BA0\u7D20\u6750\u89E3\u7801\u5931\u8D25\uFF1A${src}`)));
  }, { once: true });
  image.addEventListener("error", () => reject(new Error(`\u684C\u5BA0\u7D20\u6750\u52A0\u8F7D\u5931\u8D25\uFF1A${src}`)), { once: true });
  image.src = src;
});
var preloadPetAssets = async () => {
  const results = await Promise.allSettled(petAssetSources.map((src) => loadAndDecodeImage(src)));
  const failures = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") return;
    const src = petAssetSources[index];
    if (!src) return;
    failures.push({
      src,
      error: result.reason instanceof Error ? result.reason : new Error(String(result.reason))
    });
  });
  return failures;
};

// ../src/components/DesktopPet/petConfig.ts
var petConfig = {
  bottom: 18,
  right: 22,
  scale: 0.58,
  tabletScale: 0.5,
  mobileScale: 0.34,
  mobileBottom: 8,
  mobileRight: 8,
  movementSpeed: 58,
  walkingRange: {
    leftInset: 20,
    rightInset: 20
  },
  idleDuration: { min: 6e3, max: 14e3 },
  sitDuration: { min: 4e3, max: 9e3 },
  sleepAfter: { min: 35e3, max: 6e4 },
  sleepDuration: { min: 14e3, max: 28e3 },
  walkOpportunity: { min: 3e4, max: 7e4 },
  walkDuration: { min: 8e3, max: 18e3 },
  walkSegmentDuration: { min: 4e3, max: 8e3 },
  floorRestDuration: { min: 4e3, max: 9e3 },
  walkProbability: 0.62,
  wakeUpDuration: 1300,
  enterBedDuration: 1150,
  reactDuration: 2500,
  clickCooldown: 500,
  gazeRadius: 260,
  transitionDuration: 260,
  dragThreshold: 5,
  dragVerticalRange: 1e4,
  dragReleaseDuration: 240,
  fallDuration: 520,
  bedEntryRadius: 88,
  mobileBreakpoint: 640,
  tabletBreakpoint: 960
};

// ../src/components/DesktopPet/petMachine.ts
var allowedTransitions = {
  idle: ["sit", "sleep", "leaveBed", "react"],
  sit: ["idle", "sleep", "react"],
  sleep: ["wakeUp", "react"],
  wakeUp: ["idle"],
  leaveBed: ["walk"],
  walk: ["floorRest", "returnBed", "react"],
  floorRest: ["walk", "returnBed", "react"],
  returnBed: ["enterBed"],
  enterBed: ["idle"],
  react: ["idle", "sit", "sleep", "walk", "floorRest"]
};
var reactableStates = ["idle", "sit", "sleep", "walk", "floorRest"];
var PetMachine = class {
  constructor() {
    __publicField(this, "currentState", "idle");
    __publicField(this, "reactReturnState", "idle");
    __publicField(this, "listeners", /* @__PURE__ */ new Set());
  }
  get state() {
    return this.currentState;
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  transition(nextState) {
    if (!allowedTransitions[this.currentState].includes(nextState)) return false;
    this.setState(nextState);
    return true;
  }
  drop(nextState) {
    this.setState(nextState);
  }
  react(returnState) {
    if (!reactableStates.includes(this.currentState)) return false;
    this.reactReturnState = returnState ?? this.currentState;
    return this.transition("react");
  }
  finishReaction() {
    if (this.currentState !== "react") return false;
    return this.transition(this.reactReturnState);
  }
  setState(nextState) {
    const previous = this.currentState;
    this.currentState = nextState;
    this.listeners.forEach((listener) => listener({ previous, current: nextState }));
  }
};

// ../src/components/DesktopPet/DesktopPet.ts
var randomBetween = (range) => range.min + Math.random() * (range.max - range.min);
var isMotionState = (state) => state === "leaveBed" || state === "walk" || state === "returnBed";
var clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
var DesktopPet = class {
  constructor(config = petConfig) {
    __publicField(this, "machine", new PetMachine());
    __publicField(this, "root", document.createElement("div"));
    __publicField(this, "bedBack", document.createElement("div"));
    __publicField(this, "bedFront", document.createElement("button"));
    __publicField(this, "actor", document.createElement("button"));
    __publicField(this, "spriteStage", document.createElement("span"));
    __publicField(this, "sprite", document.createElement("span"));
    __publicField(this, "gaze", document.createElement("span"));
    __publicField(this, "effectsLayer", document.createElement("div"));
    __publicField(this, "dialogueLayer", document.createElement("div"));
    __publicField(this, "dialogue", document.createElement("span"));
    __publicField(this, "dialogueHeart", document.createElement("span"));
    __publicField(this, "animator");
    __publicField(this, "transitionController");
    __publicField(this, "reducedMotion", window.matchMedia("(prefers-reduced-motion: reduce)"));
    __publicField(this, "config");
    __publicField(this, "unsubscribe");
    __publicField(this, "scale", 1);
    __publicField(this, "bedX", 0);
    __publicField(this, "bedY", 0);
    __publicField(this, "actorX", 0);
    __publicField(this, "actorY", 0);
    __publicField(this, "facing", "right");
    __publicField(this, "walkingDirection", -1);
    __publicField(this, "petLocation", "bed");
    __publicField(this, "dragSession", { type: "none" });
    __publicField(this, "layoutPasses", 0);
    __publicField(this, "stateTimer", 0);
    __publicField(this, "timerDeadline", 0);
    __publicField(this, "timerRemaining", 0);
    __publicField(this, "timerCallback", null);
    __publicField(this, "motionFrame", 0);
    __publicField(this, "motionTime", 0);
    __publicField(this, "fallFrame", 0);
    __publicField(this, "fallAnimation", null);
    __publicField(this, "gazeFrame", 0);
    __publicField(this, "pointerX", -1e4);
    __publicField(this, "pointerY", -1e4);
    __publicField(this, "paused", document.hidden);
    __publicField(this, "lastInteraction", performance.now());
    __publicField(this, "sleepThreshold");
    __publicField(this, "nextWalkAt");
    __publicField(this, "lastReactionAt", -Infinity);
    __publicField(this, "ignoreClickUntil", -Infinity);
    __publicField(this, "walkBudgetRemaining", 0);
    __publicField(this, "activeWalkSegmentDuration", 0);
    __publicField(this, "destroyed", false);
    __publicField(this, "handleActorClick", () => this.triggerReaction());
    __publicField(this, "handleBedClick", () => {
      if (this.petLocation === "bed") this.triggerReaction();
    });
    __publicField(this, "handleDogPointerDown", (event) => this.beginDrag("draggingDog", event));
    __publicField(this, "handleBedPointerDown", (event) => this.beginDrag("draggingBed", event));
    __publicField(this, "handleDragMove", (event) => {
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
    });
    __publicField(this, "handleDragEnd", (event) => {
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
      this.petLocation = "floor";
      this.renderPositions();
      this.startFall("dog", () => this.finishDogDrop());
    });
    __publicField(this, "handleDragCancel", (event) => {
      const session = this.dragSession;
      if (session.type === "none" || event.pointerId !== session.pointerId) return;
      this.releasePointerCapture(session);
      if (session.type === "draggingDog") {
        this.actorX = session.startActorX;
        this.actorY = session.startActorY;
      } else {
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
    });
    __publicField(this, "handlePointerEnter", () => this.actor.classList.add("is-hovered"));
    __publicField(this, "handlePointerExit", () => this.actor.classList.remove("is-hovered"));
    __publicField(this, "handlePointerMove", (event) => {
      this.pointerX = event.clientX;
      this.pointerY = event.clientY;
      this.recordInteraction(performance.now());
      if (!this.gazeFrame && !this.paused) this.gazeFrame = window.requestAnimationFrame(this.renderGaze);
    });
    __publicField(this, "handlePointerLeave", () => {
      this.pointerX = -1e4;
      this.pointerY = -1e4;
      this.setGazeFrame(4);
    });
    __publicField(this, "handleResize", () => {
      this.updateLayout();
      if (!this.walkingEnabled() && (this.machine.state === "walk" || this.machine.state === "floorRest" || this.machine.state === "leaveBed")) {
        if (this.machine.state === "leaveBed") this.machine.transition("walk");
        this.machine.transition("returnBed");
      }
    });
    __publicField(this, "handleMotionPreference", () => this.handleResize());
    __publicField(this, "handleVisibilityChange", () => {
      if (document.hidden) this.pause();
      else this.resume();
    });
    __publicField(this, "fall", (time) => {
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
    });
    __publicField(this, "move", (time) => {
      if (this.paused || this.dragSession.type === "draggingDog") return;
      const delta = this.motionTime ? Math.min((time - this.motionTime) / 1e3, 0.05) : 0;
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
    });
    __publicField(this, "renderGaze", () => {
      this.gazeFrame = 0;
      this.renderGazeNow();
    });
    this.config = config;
    this.sleepThreshold = randomBetween(config.sleepAfter);
    this.nextWalkAt = performance.now() + randomBetween(config.walkOpportunity);
    this.buildDom();
    this.animator = new SpriteAnimator(this.sprite, petSprites.idle);
    this.transitionController = new SpriteTransitionController(this.spriteStage, this.animator);
    this.unsubscribe = this.machine.subscribe(({ previous, current }) => this.enterState(previous, current));
  }
  mount(parent = document.body) {
    if (document.querySelector("[data-desktop-pet]")) return;
    this.root.dataset.assetStatus = "loading";
    parent.append(this.root);
    this.updateLayout();
    this.addListeners();
    void this.initializeAfterAssetsReady();
  }
  destroy() {
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
  async initializeAfterAssetsReady() {
    const failures = await preloadPetAssets();
    if (this.destroyed) return;
    if (failures.length > 0) {
      this.root.dataset.assetStatus = "error";
      failures.forEach(({ src, error }) => console.error(`\u684C\u5BA0\u7D20\u6750\u9884\u52A0\u8F7D\u5931\u8D25\uFF1A${src}`, error));
    } else {
      this.root.dataset.assetStatus = "ready";
    }
    this.enterState("idle", "idle");
    if (this.paused) this.animator.pause();
    else this.animator.start();
  }
  buildDom() {
    this.root.className = "desktop-pet-root";
    this.root.dataset.desktopPet = "true";
    this.root.style.setProperty("--pet-transition-half", `${this.config.transitionDuration / 2}ms`);
    this.root.style.setProperty("--pet-release-duration", `${this.config.dragReleaseDuration}ms`);
    this.root.setAttribute("role", "group");
    this.root.setAttribute("aria-label", "\u53EF\u4E92\u52A8\u3001\u53EF\u62D6\u52A8\u7684\u50CF\u7D20\u67F4\u72AC\u7F51\u9875\u684C\u5BA0");
    this.bedBack.className = "desktop-pet-bed desktop-pet-bed--back pixel-sprite";
    this.applyStaticSprite(this.bedBack, bedBackSprite);
    this.bedBack.style.backgroundImage = `url("${bedFrontSprite.src}"), url("${bedBackSprite.src}")`;
    this.bedBack.style.backgroundSize = `${bedBackSprite.frameWidth}px ${bedBackSprite.frameHeight}px`;
    this.bedFront.type = "button";
    this.bedFront.className = "desktop-pet-bed desktop-pet-bed--front";
    this.bedFront.setAttribute("aria-label", "\u62D6\u52A8 Hotdog \u67F4\u72AC\u5C0F\u7A9D");
    this.bedFront.style.width = `${bedFrontSprite.frameWidth}px`;
    this.bedFront.style.height = `${bedFrontSprite.frameHeight}px`;
    this.actor.type = "button";
    this.actor.className = "desktop-pet-actor";
    this.actor.setAttribute("aria-label", "\u548C\u50CF\u7D20\u67F4\u72AC\u4E92\u52A8\u6216\u62D6\u52A8\u67F4\u72AC");
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
    this.dialogue.setAttribute("aria-label", "\u67F4\u72AC\u5F88\u5F00\u5FC3");
    this.dialogueHeart.className = "desktop-pet-dialogue-heart pixel-sprite";
    this.dialogueHeart.style.backgroundImage = `url("${heartSprite.src}")`;
    const dialogueHeartScale = 0.5;
    this.dialogueHeart.style.backgroundSize = `${heartSprite.frameWidth * heartSprite.frameCount * dialogueHeartScale}px ${heartSprite.frameHeight * dialogueHeartScale}px`;
    this.dialogueHeart.style.backgroundPosition = `${-2 * heartSprite.frameWidth * dialogueHeartScale}px 0`;
    this.dialogue.append(this.dialogueHeart);
    this.dialogueLayer.append(this.dialogue);
    this.root.append(this.bedBack, this.actor, this.bedFront, this.effectsLayer, this.dialogueLayer);
  }
  addListeners() {
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
  triggerReaction() {
    const now = performance.now();
    if (now < this.ignoreClickUntil || now - this.lastReactionAt < this.config.clickCooldown) return;
    this.recordInteraction(now);
    const returnState = this.petLocation === "floor" ? "floorRest" : void 0;
    if (!this.machine.react(returnState)) return;
    this.lastReactionAt = now;
  }
  beginDrag(type, event) {
    if (event.button !== 0 || this.dragSession.type !== "none" || this.transitionController.active || this.fallAnimation) return;
    event.preventDefault();
    const captureElement = type === "draggingDog" ? this.actor : this.bedFront;
    captureElement.setPointerCapture(event.pointerId);
    const data = {
      phase: "pending",
      pointerId: event.pointerId,
      captureElement,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startActorX: this.actorX,
      startActorY: this.actorY,
      startBedX: this.bedX,
      startBedY: this.bedY,
      timer: null
    };
    this.dragSession = type === "draggingDog" ? { type, ...data } : { type, ...data };
  }
  releasePointerCapture(session) {
    if (session.captureElement.hasPointerCapture(session.pointerId)) {
      session.captureElement.releasePointerCapture(session.pointerId);
    }
  }
  enterState(previous, current) {
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
      this.animator.setDefinition(animation);
      this.showReaction();
      this.beginStateBehavior(previous, current);
      return;
    }
    const transitionDuration = previous === current || this.reducedMotion.matches ? 0 : this.config.transitionDuration;
    this.transitionController.run(animation, transitionDuration, () => this.beginStateBehavior(previous, current));
  }
  beginStateBehavior(previous, current) {
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
          randomBetween(this.config.walkSegmentDuration)
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
  consumeActiveWalkSegment() {
    if (this.activeWalkSegmentDuration <= 0) return;
    const remaining = this.currentTimerRemaining() ?? 0;
    const elapsed = Math.max(0, this.activeWalkSegmentDuration - remaining);
    this.walkBudgetRemaining = Math.max(0, this.walkBudgetRemaining - elapsed);
    this.activeWalkSegmentDuration = 0;
  }
  finishWalkSegment() {
    this.walkBudgetRemaining = Math.max(0, this.walkBudgetRemaining - this.activeWalkSegmentDuration);
    this.activeWalkSegmentDuration = 0;
    if (this.walkBudgetRemaining <= 0) this.machine.transition("returnBed");
    else this.machine.transition("floorRest");
  }
  finishFloorRest() {
    if (this.walkBudgetRemaining > 0 && this.walkingEnabled()) this.machine.transition("walk");
    else this.machine.transition("returnBed");
  }
  finishIdle() {
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
  finishSit() {
    if (performance.now() - this.lastInteraction >= this.sleepThreshold) this.machine.transition("sleep");
    else this.machine.transition("idle");
  }
  recordInteraction(now) {
    this.lastInteraction = now;
    this.sleepThreshold = randomBetween(this.config.sleepAfter);
  }
  showReaction() {
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
  startMotion() {
    if (this.motionFrame || this.paused || this.dragSession.type === "draggingDog") return;
    this.motionTime = 0;
    this.motionFrame = window.requestAnimationFrame(this.move);
  }
  stopMotion() {
    if (this.motionFrame) window.cancelAnimationFrame(this.motionFrame);
    this.motionFrame = 0;
    this.motionTime = 0;
  }
  startFall(target, onComplete) {
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
    this.fallAnimation = {
      target,
      fromActorY: this.actorY,
      fromBedY: this.bedY,
      toActorY,
      toBedY,
      duration: this.config.fallDuration,
      onComplete,
      elapsed: 0,
      startedAt: performance.now()
    };
    this.root.dataset.fallTarget = target;
    this.fallFrame = window.requestAnimationFrame(this.fall);
  }
  finishFall(target, onComplete) {
    if (target === "dog") this.playDogReleaseAnimation();
    onComplete();
  }
  finishDogDrop() {
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
  cancelFall() {
    if (this.fallFrame) window.cancelAnimationFrame(this.fallFrame);
    this.fallFrame = 0;
    this.fallAnimation = null;
    delete this.root.dataset.fallTarget;
  }
  pauseFall() {
    const animation = this.fallAnimation;
    if (!animation) return;
    if (this.fallFrame) window.cancelAnimationFrame(this.fallFrame);
    this.fallFrame = 0;
    animation.elapsed += performance.now() - animation.startedAt;
  }
  resumeFall() {
    const animation = this.fallAnimation;
    if (!animation || this.fallFrame) return;
    animation.startedAt = performance.now();
    this.fallFrame = window.requestAnimationFrame(this.fall);
  }
  updateLayout() {
    const isMobile = window.innerWidth <= this.config.mobileBreakpoint;
    this.scale = isMobile ? this.config.mobileScale : window.innerWidth <= this.config.tabletBreakpoint ? this.config.tabletScale : this.config.scale;
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
  actorBounds() {
    const isMobile = window.innerWidth <= this.config.mobileBreakpoint;
    const bottomInset = isMobile ? this.config.mobileBottom : this.config.bottom;
    const width = petSprites.walk.frameWidth * this.scale;
    const height = petSprites.walk.frameHeight * this.scale;
    const bottom = window.innerHeight - bottomInset - height;
    return {
      left: this.config.walkingRange.leftInset,
      right: Math.max(this.config.walkingRange.leftInset, window.innerWidth - width - this.config.walkingRange.rightInset),
      top: bottom,
      bottom
    };
  }
  actorDragBounds() {
    const ground = this.actorBounds();
    return { ...ground, top: Math.max(0, ground.bottom - this.config.dragVerticalRange) };
  }
  bedBounds() {
    const isMobile = window.innerWidth <= this.config.mobileBreakpoint;
    const bottomInset = isMobile ? this.config.mobileBottom : this.config.bottom;
    const width = bedFrontSprite.frameWidth * this.scale;
    const height = bedFrontSprite.frameHeight * this.scale;
    const bottom = window.innerHeight - bottomInset - height;
    return {
      left: this.config.walkingRange.leftInset,
      right: Math.max(this.config.walkingRange.leftInset, window.innerWidth - width - this.config.walkingRange.rightInset),
      top: bottom,
      bottom
    };
  }
  bedDragBounds() {
    const ground = this.bedBounds();
    return { ...ground, top: Math.max(0, ground.bottom - this.config.dragVerticalRange) };
  }
  bedActorY() {
    return this.bedY - (petSprites.idle.frameHeight - bedFrontSprite.frameHeight) * this.scale;
  }
  alignActorWithBed() {
    this.actorX = this.bedX;
    this.actorY = this.bedActorY();
  }
  isDogAtBedEntrance() {
    return Math.hypot(this.actorX - this.bedX, this.actorY - this.bedActorY()) <= this.config.bedEntryRadius * this.scale;
  }
  renderPositions() {
    const bedTransform = `translate3d(${this.bedX}px, ${this.bedY}px, 0) scale(${this.scale})`;
    const actorTransform = `translate3d(${this.actorX}px, ${this.actorY}px, 0) scale(${this.scale})`;
    this.bedBack.style.transform = bedTransform;
    this.bedFront.style.transform = bedTransform;
    this.actor.style.transform = actorTransform;
    this.effectsLayer.style.transform = actorTransform;
    this.dialogueLayer.style.transform = actorTransform;
    this.root.dataset.petLocation = this.petLocation;
  }
  restoreCurrentSprite() {
    this.animator.setDefinition(this.spriteForState(this.machine.state));
  }
  spriteForState(state) {
    if (state === "react" && this.petLocation === "bed") return bedReactSprite;
    return petSprites[state];
  }
  setFacing(facing) {
    this.facing = facing;
    this.sprite.style.setProperty("--sprite-facing", facing === "left" ? "-1" : "1");
  }
  renderGazeNow() {
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
  setGazeFrame(frame) {
    this.gaze.style.backgroundPosition = `${-frame * gazeSprite.frameWidth}px 0`;
    this.gaze.classList.toggle("is-visible", this.machine.state === "idle" || this.machine.state === "sit");
  }
  scheduleState(callback, delay) {
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
  currentTimerRemaining() {
    if (!this.timerCallback) return null;
    return this.stateTimer ? Math.max(0, this.timerDeadline - performance.now()) : this.timerRemaining;
  }
  suspendStateTimer() {
    if (!this.timerCallback) return null;
    const snapshot = {
      callback: this.timerCallback,
      remaining: this.currentTimerRemaining() ?? 0
    };
    if (this.stateTimer) window.clearTimeout(this.stateTimer);
    this.stateTimer = 0;
    this.timerCallback = null;
    this.timerRemaining = 0;
    return snapshot;
  }
  resumeSuspendedBehavior(timer) {
    this.transitionController.resume();
    if (timer) this.scheduleState(timer.callback, timer.remaining);
    if (!this.transitionController.active && isMotionState(this.machine.state)) this.startMotion();
  }
  clearStateTimer() {
    if (this.stateTimer) window.clearTimeout(this.stateTimer);
    this.stateTimer = 0;
    this.timerCallback = null;
    this.timerRemaining = 0;
  }
  pause() {
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
  resume() {
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
  playDogReleaseAnimation() {
    if (this.reducedMotion.matches) return;
    this.spriteStage.classList.remove("is-settling");
    void this.spriteStage.offsetWidth;
    this.spriteStage.classList.add("is-settling");
    this.spriteStage.addEventListener("animationend", () => this.spriteStage.classList.remove("is-settling"), { once: true });
  }
  walkingEnabled() {
    return window.innerWidth > this.config.mobileBreakpoint && !this.reducedMotion.matches;
  }
  applyStaticSprite(element, definition) {
    element.style.width = `${definition.frameWidth}px`;
    element.style.height = `${definition.frameHeight}px`;
    element.style.backgroundImage = `url("${definition.src}")`;
    element.style.backgroundSize = `${definition.frameWidth * definition.frameCount}px ${definition.frameHeight}px`;
  }
};
new DesktopPet().mount();
export {
  DesktopPet
};
