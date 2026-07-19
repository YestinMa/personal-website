import type { PetState, SpriteDefinition } from "./types";

const petAsset = (fileName: string): string => new URL(`../images/pet/${fileName}`, import.meta.url).href;

const inBedSprite = (fileName: string, fps: number, loop = true): SpriteDefinition => ({
  src: petAsset(fileName),
  frameWidth: 256,
  frameHeight: 160,
  frameCount: 4,
  fps,
  loop,
  anchorX: 0.5,
  anchorY: 1,
});

export const petSprites: Readonly<Record<PetState, SpriteDefinition>> = {
  idle: inBedSprite("shiba-idle.png", 2.4),
  sit: inBedSprite("shiba-sit.png", 2.2),
  sleep: inBedSprite("shiba-sleep.png", 1.6),
  wakeUp: inBedSprite("shiba-wake.png", 4, false),
  leaveBed: inBedSprite("shiba-walk.png", 7),
  walk: inBedSprite("shiba-walk.png", 8),
  returnBed: inBedSprite("shiba-walk.png", 8),
  enterBed: inBedSprite("shiba-wake.png", 4, false),
  react: inBedSprite("shiba-react.png", 5),
};

export const bedBackSprite: SpriteDefinition = {
  src: petAsset("bed-back.png"),
  frameWidth: 256,
  frameHeight: 128,
  frameCount: 1,
  fps: 1,
  loop: false,
  anchorX: 0.5,
  anchorY: 1,
};

export const bedFrontSprite: SpriteDefinition = {
  ...bedBackSprite,
  src: petAsset("bed-front.png"),
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
};
