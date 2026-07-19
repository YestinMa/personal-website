export type PetState =
  | "idle"
  | "sit"
  | "sleep"
  | "wakeUp"
  | "leaveBed"
  | "walk"
  | "floorRest"
  | "returnBed"
  | "enterBed"
  | "react";

export type RestingState = "idle" | "sit" | "sleep";
export type ReactableState = RestingState | "walk" | "floorRest";
export type Facing = "left" | "right";

export interface DurationRange {
  readonly min: number;
  readonly max: number;
}

export interface SpriteDefinition {
  readonly src: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
  readonly fps: number;
  readonly loop: boolean;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly visualScale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface WalkingRange {
  readonly leftInset: number;
  readonly rightInset: number;
}

export interface PetConfig {
  readonly bottom: number;
  readonly right: number;
  readonly scale: number;
  readonly tabletScale: number;
  readonly mobileScale: number;
  readonly mobileBottom: number;
  readonly mobileRight: number;
  readonly movementSpeed: number;
  readonly walkingRange: WalkingRange;
  readonly idleDuration: DurationRange;
  readonly sitDuration: DurationRange;
  readonly sleepAfter: DurationRange;
  readonly sleepDuration: DurationRange;
  readonly walkOpportunity: DurationRange;
  readonly walkDuration: DurationRange;
  readonly walkSegmentDuration: DurationRange;
  readonly floorRestDuration: DurationRange;
  readonly walkProbability: number;
  readonly wakeUpDuration: number;
  readonly enterBedDuration: number;
  readonly reactDuration: number;
  readonly clickCooldown: number;
  readonly gazeRadius: number;
  readonly transitionDuration: number;
  readonly dragThreshold: number;
  readonly dragVerticalRange: number;
  readonly dragReleaseDuration: number;
  readonly fallDuration: number;
  readonly bedEntryRadius: number;
  readonly mobileBreakpoint: number;
  readonly tabletBreakpoint: number;
}

export interface PetStateChange {
  readonly previous: PetState;
  readonly current: PetState;
}

export type PetStateListener = (change: PetStateChange) => void;
