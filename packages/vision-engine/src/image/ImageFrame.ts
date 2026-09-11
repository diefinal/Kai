export interface ImageFrame {
  width: number;
  height: number;
  channels: number;
  timestamp: number;
  data: Uint8Array;
}
