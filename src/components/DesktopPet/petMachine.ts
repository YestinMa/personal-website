import type { PetState, PetStateListener, ReactableState } from "./types";

const allowedTransitions: Readonly<Record<PetState, readonly PetState[]>> = {
  idle: ["sit", "sleep", "leaveBed", "react"],
  sit: ["idle", "sleep", "react"],
  sleep: ["wakeUp", "react"],
  wakeUp: ["idle"],
  leaveBed: ["walk"],
  walk: ["floorRest", "returnBed", "react"],
  floorRest: ["walk", "returnBed", "react"],
  returnBed: ["enterBed"],
  enterBed: ["idle"],
  react: ["idle", "sit", "sleep", "walk", "floorRest"],
};

const reactableStates: readonly ReactableState[] = ["idle", "sit", "sleep", "walk", "floorRest"];

export class PetMachine {
  private currentState: PetState = "idle";
  private reactReturnState: ReactableState = "idle";
  private readonly listeners = new Set<PetStateListener>();

  get state(): PetState {
    return this.currentState;
  }

  subscribe(listener: PetStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  transition(nextState: PetState): boolean {
    if (!allowedTransitions[this.currentState].includes(nextState)) return false;
    this.setState(nextState);
    return true;
  }

  drop(nextState: "walk" | "returnBed" | "enterBed"): void {
    this.setState(nextState);
  }

  react(returnState?: ReactableState): boolean {
    if (!reactableStates.includes(this.currentState as ReactableState)) return false;
    this.reactReturnState = returnState ?? this.currentState as ReactableState;
    return this.transition("react");
  }

  finishReaction(): boolean {
    if (this.currentState !== "react") return false;
    return this.transition(this.reactReturnState);
  }

  private setState(nextState: PetState): void {
    const previous = this.currentState;
    this.currentState = nextState;
    this.listeners.forEach((listener) => listener({ previous, current: nextState }));
  }
}
