import { ImageFrame } from '../image/ImageFrame';

export interface OcrBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrResult {
  text: string;
  confidence: number;
  bounds: OcrBounds;
}

export interface OcrProvider {
  recognize(image: ImageFrame): Promise<OcrResult[]>;
}
