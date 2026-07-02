export interface NormPoint {
  x: number;
  y: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}

export interface PolygonShape {
  id: string;
  points: NormPoint[];
  rotation: number;
  color: string;
}

export interface ProductPolygons {
  productId: string;
  shapes: PolygonShape[];
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const POLYGON_PALETTE: readonly string[] = [
  '#1a73e8',
  '#1e8e3e',
  '#f9ab00',
  '#d93025',
  '#9334e6',
];
