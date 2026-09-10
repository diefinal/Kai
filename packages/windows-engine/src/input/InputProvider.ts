import { Key } from './Key';

export interface InputProvider {
  pressKey(key: Key): Promise<void>;
  releaseKey(key: Key): Promise<void>;
  tapKey(key: Key): Promise<void>;
  typeText(text: string): Promise<void>;
}
