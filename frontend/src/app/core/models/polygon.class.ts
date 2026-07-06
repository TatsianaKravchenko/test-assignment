import { NormPoint, PixelPoint, PolygonShape, Rect } from './polygon.model';

export const ROTATE_HANDLE_OFFSET = 28;
export const ROTATE_HANDLE_RADIUS = 9;
export const CLOSE_SNAP_RADIUS = 12;

function rotate(p: PixelPoint, cx: number, cy: number, angle: number): PixelPoint {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

export class PolygonModel {
  constructor(public shape: PolygonShape) {}

  private basePixels(rect: Rect): PixelPoint[] {
    return this.shape.points.map((pt) => ({
      x: rect.x + pt.x * rect.width,
      y: rect.y + pt.y * rect.height,
    }));
  }

  center(rect: Rect): PixelPoint {
    const pts = this.basePixels(rect);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }

  pixels(rect: Rect): PixelPoint[] {
    const c = this.center(rect);
    return this.basePixels(rect).map((p) => rotate(p, c.x, c.y, this.shape.rotation));
  }

  path(rect: Rect): Path2D {
    const pts = this.pixels(rect);
    const path = new Path2D();
    pts.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
    path.closePath();
    return path;
  }

  frameCorners(rect: Rect): PixelPoint[] {
    const pts = this.basePixels(rect);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const c = this.center(rect);
    return [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ].map((p) => rotate(p, c.x, c.y, this.shape.rotation));
  }

  rotateHandle(rect: Rect): PixelPoint {
    const pts = this.basePixels(rect);
    const minY = Math.min(...pts.map((p) => p.y));
    const c = this.center(rect);
    return rotate({ x: c.x, y: minY - ROTATE_HANDLE_OFFSET }, c.x, c.y, this.shape.rotation);
  }

  rotateStemAnchor(rect: Rect): PixelPoint {
    const pts = this.basePixels(rect);
    const minY = Math.min(...pts.map((p) => p.y));
    const c = this.center(rect);
    return rotate({ x: c.x, y: minY }, c.x, c.y, this.shape.rotation);
  }

  containsPoint(ctx: CanvasRenderingContext2D, rect: Rect, px: number, py: number): boolean {
    const m = ctx.getTransform();
    const dx = m.a * px + m.c * py + m.e;
    const dy = m.b * px + m.d * py + m.f;
    return ctx.isPointInPath(this.path(rect), dx, dy);
  }

  isOnRotateHandle(rect: Rect, px: number, py: number): boolean {
    const h = this.rotateHandle(rect);
    return Math.hypot(px - h.x, py - h.y) <= ROTATE_HANDLE_RADIUS + 3;
  }

  translate(rect: Rect, dxPx: number, dyPx: number): NormPoint[] {
    const dnx = dxPx / rect.width;
    const dny = dyPx / rect.height;
    return this.shape.points.map((p) => ({ x: p.x + dnx, y: p.y + dny }));
  }

  rotationToward(rect: Rect, px: number, py: number): number {
    const c = this.center(rect);
    return Math.atan2(py - c.y, px - c.x) + Math.PI / 2;
  }
}

export function pixelToNorm(rect: Rect, px: number, py: number): NormPoint {
  return { x: (px - rect.x) / rect.width, y: (py - rect.y) / rect.height };
}
