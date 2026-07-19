import type { PetState, SpriteDefinition } from "./types";

const petAsset = (fileName: string): string => new URL(`../images/pet/${fileName}`, import.meta.url).href;

const petSprite = (fileName: string, fps: number, loop = true, offsetY = -18): SpriteDefinition => ({
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
  offsetY,
});

export const petSprites: Readonly<Record<PetState, SpriteDefinition>> = {
  idle: petSprite("shiba-idle.png", 2.4),
  sit: petSprite("shiba-sit.png", 2.2),
  sleep: petSprite("shiba-sleep.png", 1.6),
  wakeUp: petSprite("shiba-wake.png", 4, false),
  leaveBed: petSprite("shiba-walk.png", 7),
  walk: petSprite("shiba-walk.png", 8, true, 0),
  returnBed: petSprite("shiba-walk.png", 8, true, 0),
  enterBed: petSprite("shiba-wake.png", 4, false),
  react: petSprite("shiba-react.png", 5, true, 0),
};

export const dogLiftSprite: SpriteDefinition = petSprite("shiba-lift.png", 6, true, 0);

export const bedBackSprite: SpriteDefinition = {
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
  offsetY: 0,
};

export const bedFrontSprite: SpriteDefinition = {
  ...bedBackSprite,
  src: petAsset("bed-front-low.png"),
};

export const gazeSprite: SpriteDefinition = {
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
  offsetY: 0,
};

export const heartSprite: SpriteDefinition = {
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
  offsetY: 0,
};
