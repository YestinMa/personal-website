import type { PetState, SpriteDefinition } from "./types";

const petAssetVersion = "1.8.2";
const petAsset = (fileName: string): string =>
  new URL(`../images/pet/${fileName}?v=${petAssetVersion}`, import.meta.url).href;

const petSprite = (fileName: string, fps: number, loop = true, offsetY = 0): SpriteDefinition => ({
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
  // 窝内帧保持统一画布基线，由舞台裁切身体；禁止负偏移再次切掉耳朵。
  idle: petSprite("shiba-idle.png", 2.4),
  sit: petSprite("shiba-sit.png", 2.2),
  sleep: petSprite("shiba-sleep.png", 1.6),
  wakeUp: petSprite("shiba-wake.png", 4, false),
  leaveBed: petSprite("shiba-walk-v2.png", 7),
  walk: petSprite("shiba-walk-v2.png", 8, true, 0),
  floorRest: {
    ...petSprite("shiba-idle.png", 2.4, true, 0),
    visualScale: 0.95,
  },
  returnBed: petSprite("shiba-walk-v2.png", 8, true, 0),
  enterBed: petSprite("shiba-wake.png", 4, false),
  // 窝外互动立即进入与 floorRest 相同尺寸的趴姿，避免原地踏步和旧互动帧尾巴串层。
  react: {
    ...petSprite("shiba-idle.png", 2.4),
    visualScale: 0.95,
  },
};

export const dogLiftSprite: SpriteDefinition = petSprite("shiba-lift.png", 6, true, 0);
export const bedReactSprite: SpriteDefinition = petSprite("shiba-idle.png", 2.4);

export const bedBackSprite: SpriteDefinition = {
  src: petAsset("bed-hotdog.png"),
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
  src: petAsset("bed-front-mask.png"),
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

export interface PetAssetLoadFailure {
  readonly src: string;
  readonly error: Error;
}

const allSpriteDefinitions: readonly SpriteDefinition[] = [
  ...Object.values(petSprites),
  dogLiftSprite,
  bedReactSprite,
  bedBackSprite,
  bedFrontSprite,
  gazeSprite,
  heartSprite,
];

export const petAssetSources: readonly string[] = [...new Set(allSpriteDefinitions.map(({ src }) => src))];

const loadAndDecodeImage = (src: string): Promise<void> => new Promise((resolve, reject) => {
  const image = new Image();
  image.addEventListener("load", () => {
    image.decode().then(resolve, () => reject(new Error(`桌宠素材解码失败：${src}`)));
  }, { once: true });
  image.addEventListener("error", () => reject(new Error(`桌宠素材加载失败：${src}`)), { once: true });
  image.src = src;
});

export const preloadPetAssets = async (): Promise<readonly PetAssetLoadFailure[]> => {
  // 等待全部唯一素材完成解码；单个失败会被结构化返回，避免阻塞其他可用素材。
  const results = await Promise.allSettled(petAssetSources.map((src) => loadAndDecodeImage(src)));
  const failures: PetAssetLoadFailure[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") return;
    const src = petAssetSources[index];
    if (!src) return;
    failures.push({
      src,
      error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
    });
  });
  return failures;
};
