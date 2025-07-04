export interface AnimSprite {
  name: string;
  duration: number;
  durationUpToNow: number;
  timestampBegin?: number;
  timestampEnd?: number;
  offsetX?: number;
  offsetY?: number;
  opacity?: number;
  hasPlayedSound: boolean;
}

export class Animation {
  name: string;
  loop: boolean;
  sprites: AnimSprite[];
  done: boolean;
  totalDurationMs: number;
  currentSpriteIndex: number;
  timestampStart: number;
  timestampPause: number;

  constructor(loop: boolean) {
    this.loop = loop || false;
    this.sprites = [];
    this.done = false;
    this.timestampPause = 0;
    this.totalDurationMs = 0;
    this.currentSpriteIndex = 0;
    this.timestampStart = 0;
    this.name = ''; // set when constructed from a builder
  }

  reset(): void {
    this.done = false;
    this.currentSpriteIndex = 0;
  }

  start(): void {
    this.timestampStart = performance.now();
  }

  getDurationMs(): number {
    return this.totalDurationMs;
  }

  getLongestFrameMs(): number {
    return this.sprites.reduce((ms: number, sprite: AnimSprite) => {
      return sprite.duration > ms ? sprite.duration : ms;
    }, 0);
  }

  getLongestFrameIndex(): number {
    let ms = 0;
    return this.sprites.reduce((ind: number, sprite: AnimSprite, i: number) => {
      if (sprite.duration > ms) {
        ms = sprite.duration;
        return i;
      } else {
        return ind;
      }
    }, 0);
  }

  getDurationToIndex(i: number): number {
    if (i >= this.sprites.length) {
      return this.totalDurationMs;
    } else {
      return this.sprites[i]?.durationUpToNow ?? 0;
    }
  }

  addSprite({
    name,
    duration,
    offsetX,
    offsetY,
    opacity,
  }: Partial<AnimSprite>): void {
    this.sprites.push({
      name: name || '',
      timestampBegin: this.totalDurationMs,
      timestampEnd: this.totalDurationMs + (duration ?? 0),
      duration: duration ?? 0,
      durationUpToNow: this.totalDurationMs,
      offsetX: offsetX || 0,
      offsetY: offsetY || 0,
      opacity,
      hasPlayedSound: false,
    });
    this.totalDurationMs += duration ?? 0;
  }

  getAnimIndex(timestampNow: number): number {
    let lastIndex = 0;
    let leftI = this.currentSpriteIndex;
    let rightI = this.sprites.length - 1;
    while (leftI <= rightI) {
      const midI = leftI + Math.floor((rightI - leftI) / 2);
      lastIndex = midI;
      const { timestampEnd, timestampBegin } = this.sprites[midI];

      const beginTime = (timestampBegin || 0) + this.timestampStart;
      const endTime = (timestampEnd || 0) + this.timestampStart;

      if (timestampNow < endTime && timestampNow > beginTime) {
        return midI;
      }

      if (timestampNow >= endTime) {
        leftI = midI + 1;
      } else {
        rightI = midI - 1;
      }
    }
    return lastIndex;
  }

  update(): void {
    const now = performance.now();
    if (this.currentSpriteIndex === this.sprites.length - 1) {
      if (this.loop && now - this.timestampStart > this.totalDurationMs) {
        const newStart = this.timestampStart + this.totalDurationMs;
        this.reset();
        this.start();
        if (now - newStart < this.totalDurationMs) {
          this.timestampStart = newStart;
        }
      }
    }
    this.currentSpriteIndex = this.getAnimIndex(now);
    if (!this.loop) {
      if (now - this.timestampStart >= this.totalDurationMs) {
        this.done = true;
      }
    }
  }

  getSpriteName(i?: number): string {
    return this.sprites[i ?? this.currentSpriteIndex]?.name;
  }

  setCurrentSprite(i: number) {
    this.currentSpriteIndex = i;
  }

  isDone(): boolean {
    return this.done;
  }
}

type AnimationBuilder = () => Animation;
const animationBuilders: {
  [key: string]: AnimationBuilder;
} = {};
export const createAnimationBuilder = (
  name: string,
  builder: () => Animation
): void => {
  animationBuilders[name] = builder;
};

export const hasAnimation = (animName: string): boolean => {
  if (animationBuilders[animName] || animName === 'invisible') {
    return true;
  } else {
    return false;
  }
};

export const createAnimation = (animName: string): Animation => {
  if (animName === 'invisible') {
    const anim = new Animation(false);
    anim.addSprite({ name: 'invisible', duration: 100 });
    return anim;
  }

  const builder = animationBuilders[animName];
  if (builder) {
    const anim = builder();
    anim.name = animName;
    anim.start();
    return anim;
  } else {
    throw new Error(`No animation exists which is named '${animName}'`);
  }
};
