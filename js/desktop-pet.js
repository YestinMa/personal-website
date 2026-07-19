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
  setDefinition(definition) {
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
    const { src, frameWidth, frameHeight, frameCount } = this.definition;
    this.element.style.width = `${frameWidth}px`;
    this.element.style.height = `${frameHeight}px`;
    this.element.style.backgroundImage = `url("${src}")`;
    this.element.style.backgroundSize = `${frameWidth * frameCount}px ${frameHeight}px`;
    this.element.style.backgroundPosition = "0 0";
  }
};

// ../src/components/DesktopPet/petAssets.ts
var petAsset = (fileName) => new URL(`../images/pet/${fileName}`, import.meta.url).href;
var inBedSprite = (fileName, fps, loop = true) => ({
  src: petAsset(fileName),
  frameWidth: 256,
  frameHeight: 160,
  frameCount: 4,
  fps,
  loop,
  anchorX: 0.5,
  anchorY: 1
});
var petSprites = {
  idle: inBedSprite("shiba-idle.png", 2.4),
  sit: inBedSprite("shiba-sit.png", 2.2),
  sleep: inBedSprite("shiba-sleep.png", 1.6),
  wakeUp: inBedSprite("shiba-wake.png", 4, false),
  leaveBed: inBedSprite("shiba-walk.png", 7),
  walk: inBedSprite("shiba-walk.png", 8),
  returnBed: inBedSprite("shiba-walk.png", 8),
  enterBed: inBedSprite("shiba-wake.png", 4, false),
  react: inBedSprite("shiba-react.png", 5)
};
var bedBackSprite = {
  src: petAsset("bed-back.png"),
  frameWidth: 256,
  frameHeight: 128,
  frameCount: 1,
  fps: 1,
  loop: false,
  anchorX: 0.5,
  anchorY: 1
};
var bedFrontSprite = {
  ...bedBackSprite,
  src: petAsset("bed-front.png")
};
var gazeSprite = {
  src: petAsset("gaze.png"),
  frameWidth: 12,
  frameHeight: 6,
  frameCount: 9,
  fps: 1,
  loop: false,
  anchorX: 0.5,
  anchorY: 0.5
};
var heartSprite = {
  src: petAsset("effects-hearts.png"),
  frameWidth: 64,
  frameHeight: 64,
  frameCount: 4,
  fps: 1,
  loop: false,
  anchorX: 0.5,
  anchorY: 0.5
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
  walkProbability: 0.62,
  wakeUpDuration: 1300,
  enterBedDuration: 1150,
  reactDuration: 2500,
  clickCooldown: 500,
  gazeRadius: 260,
  mobileBreakpoint: 640,
  tabletBreakpoint: 960,
  dialogue: ["\u6C6A\uFF01\u4ECA\u5929\u4E5F\u8981\u5F00\u5FC3\u3002", "\u6478\u6478\u6536\u5230\u5566\uFF01", "\u8981\u4E00\u8D77\u6563\u6B65\u5417\uFF1F", "\u8FD9\u91CC\u662F\u6211\u7684 Hotdog \u5C0F\u7A9D\u3002"]
};

// ../src/components/DesktopPet/petMachine.ts
var allowedTransitions = {
  idle: ["sit", "sleep", "leaveBed", "react"],
  sit: ["idle", "sleep", "react"],
  sleep: ["wakeUp", "react"],
  wakeUp: ["idle"],
  leaveBed: ["walk"],
  walk: ["returnBed", "react"],
  returnBed: ["enterBed"],
  enterBed: ["idle"],
  react: ["idle", "sit", "sleep", "walk"]
};
var reactableStates = ["idle", "sit", "sleep", "walk"];
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
    const previous = this.currentState;
    this.currentState = nextState;
    this.listeners.forEach((listener) => listener({ previous, current: nextState }));
    return true;
  }
  react() {
    if (!reactableStates.includes(this.currentState)) return false;
    this.reactReturnState = this.currentState;
    return this.transition("react");
  }
  finishReaction() {
    if (this.currentState !== "react") return false;
    return this.transition(this.reactReturnState);
  }
};

// ../src/components/DesktopPet/DesktopPet.ts
var randomBetween = (range) => range.min + Math.random() * (range.max - range.min);
var isMotionState = (state) => state === "leaveBed" || state === "walk" || state === "returnBed";
var isInBedState = (state) => state !== "leaveBed" && state !== "walk" && state !== "returnBed";
var DesktopPet = class {
  constructor(config = petConfig) {
    __publicField(this, "machine", new PetMachine());
    __publicField(this, "root", document.createElement("div"));
    __publicField(this, "bedBack", document.createElement("div"));
    __publicField(this, "bedFront", document.createElement("button"));
    __publicField(this, "actor", document.createElement("button"));
    __publicField(this, "sprite", document.createElement("span"));
    __publicField(this, "gaze", document.createElement("span"));
    __publicField(this, "effectsLayer", document.createElement("div"));
    __publicField(this, "dialogueLayer", document.createElement("div"));
    __publicField(this, "dialogue", document.createElement("span"));
    __publicField(this, "animator");
    __publicField(this, "reducedMotion", window.matchMedia("(prefers-reduced-motion: reduce)"));
    __publicField(this, "config");
    __publicField(this, "unsubscribe");
    __publicField(this, "scale", 1);
    __publicField(this, "bedX", 0);
    __publicField(this, "bedY", 0);
    __publicField(this, "actorX", 0);
    __publicField(this, "actorY", 0);
    __publicField(this, "facing", "left");
    __publicField(this, "walkingDirection", -1);
    __publicField(this, "stateTimer", 0);
    __publicField(this, "timerDeadline", 0);
    __publicField(this, "timerRemaining", 0);
    __publicField(this, "timerCallback", null);
    __publicField(this, "motionFrame", 0);
    __publicField(this, "motionTime", 0);
    __publicField(this, "gazeFrame", 0);
    __publicField(this, "pointerX", -1e4);
    __publicField(this, "pointerY", -1e4);
    __publicField(this, "paused", document.hidden);
    __publicField(this, "lastInteraction", performance.now());
    __publicField(this, "sleepThreshold");
    __publicField(this, "nextWalkAt");
    __publicField(this, "lastReactionAt", -Infinity);
    __publicField(this, "handleClick", () => {
      const now = performance.now();
      if (now - this.lastReactionAt < this.config.clickCooldown) return;
      this.recordInteraction(now);
      if (!this.machine.react()) return;
      this.lastReactionAt = now;
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
      if (!this.walkingEnabled() && (this.machine.state === "walk" || this.machine.state === "leaveBed")) {
        if (this.machine.state === "leaveBed") this.machine.transition("walk");
        this.machine.transition("returnBed");
      }
    });
    __publicField(this, "handleMotionPreference", () => this.handleResize());
    __publicField(this, "handleVisibilityChange", () => {
      if (document.hidden) this.pause();
      else this.resume();
    });
    __publicField(this, "move", (time) => {
      if (this.paused) return;
      const delta = this.motionTime ? Math.min((time - this.motionTime) / 1e3, 0.05) : 0;
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
    this.unsubscribe = this.machine.subscribe(({ previous, current }) => this.enterState(previous, current));
  }
  mount(parent = document.body) {
    if (document.querySelector("[data-desktop-pet]")) return;
    parent.append(this.root);
    this.updateLayout();
    this.addListeners();
    this.enterState("idle", "idle");
    if (this.paused) this.animator.pause();
    else this.animator.start();
  }
  destroy() {
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
  buildDom() {
    this.root.className = "desktop-pet-root";
    this.root.dataset.desktopPet = "true";
    this.root.setAttribute("role", "group");
    this.root.setAttribute("aria-label", "\u50CF\u7D20\u67F4\u72AC\u7F51\u9875\u684C\u5BA0");
    this.bedBack.className = "desktop-pet-bed desktop-pet-bed--back pixel-sprite";
    this.applyStaticSprite(this.bedBack, bedBackSprite);
    this.bedFront.type = "button";
    this.bedFront.className = "desktop-pet-bed desktop-pet-bed--front pixel-sprite";
    this.bedFront.setAttribute("aria-label", "\u548C Hotdog \u5C0F\u7A9D\u91CC\u7684\u67F4\u72AC\u4E92\u52A8");
    this.applyStaticSprite(this.bedFront, bedFrontSprite);
    this.actor.type = "button";
    this.actor.className = "desktop-pet-actor";
    this.actor.setAttribute("aria-label", "\u548C\u50CF\u7D20\u67F4\u72AC\u4E92\u52A8");
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
  createEars() {
    const fragment = document.createDocumentFragment();
    const leftEar = document.createElement("span");
    const rightEar = document.createElement("span");
    leftEar.className = "desktop-pet-ear desktop-pet-ear--left";
    rightEar.className = "desktop-pet-ear desktop-pet-ear--right";
    fragment.append(leftEar, rightEar);
    return fragment;
  }
  addListeners() {
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
  enterState(previous, current) {
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
    const messageIndex = Math.floor(Math.random() * this.config.dialogue.length);
    this.dialogue.textContent = this.config.dialogue[messageIndex] ?? this.config.dialogue[0] ?? "\u6C6A\uFF01";
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
    if (this.motionFrame || this.paused) return;
    this.motionTime = 0;
    this.motionFrame = window.requestAnimationFrame(this.move);
  }
  stopMotion() {
    if (this.motionFrame) window.cancelAnimationFrame(this.motionFrame);
    this.motionFrame = 0;
    this.motionTime = 0;
  }
  motionBounds() {
    const actorWidth = petSprites.walk.frameWidth * this.scale;
    return {
      left: this.config.walkingRange.leftInset,
      right: Math.max(this.config.walkingRange.leftInset, window.innerWidth - actorWidth - this.config.walkingRange.rightInset)
    };
  }
  updateLayout() {
    const isMobile = window.innerWidth <= this.config.mobileBreakpoint;
    this.scale = isMobile ? this.config.mobileScale : window.innerWidth <= this.config.tabletBreakpoint ? this.config.tabletScale : this.config.scale;
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
  renderPositions() {
    const bedTransform = `translate3d(${this.bedX}px, ${this.bedY}px, 0) scale(${this.scale})`;
    const actorTransform = `translate3d(${this.actorX}px, ${this.actorY}px, 0) scale(${this.scale})`;
    this.bedBack.style.transform = bedTransform;
    this.bedFront.style.transform = bedTransform;
    this.actor.style.transform = actorTransform;
    this.effectsLayer.style.transform = actorTransform;
    this.dialogueLayer.style.transform = actorTransform;
  }
  setFacing(facing) {
    this.facing = facing;
    this.sprite.classList.toggle("is-facing-left", facing === "left");
  }
  renderGazeNow() {
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
  setGazeFrame(frame) {
    this.gaze.style.backgroundPosition = `${-frame * gazeSprite.frameWidth}px 0`;
    this.gaze.classList.toggle("is-visible", this.machine.state === "idle" || this.machine.state === "sit");
  }
  scheduleState(callback, delay) {
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
  clearStateTimer() {
    if (this.stateTimer) window.clearTimeout(this.stateTimer);
    this.stateTimer = 0;
    this.timerCallback = null;
    this.timerRemaining = 0;
  }
  pause() {
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
  resume() {
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
