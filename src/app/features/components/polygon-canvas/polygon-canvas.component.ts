import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import {
  CLOSE_SNAP_RADIUS,
  PolygonModel,
  ROTATE_HANDLE_RADIUS,
  pixelToNorm,
} from '../../../core/models/polygon.class';
import { NormPoint, POLYGON_PALETTE, PolygonShape, Rect } from '../../../core/models/polygon.model';
import * as PolygonsActions from '../../../core/store/polygons/polygons.actions';
import { selectPolygonsByProduct } from '../../../core/store/polygons/polygons.selectors';
import { take } from 'rxjs';

type Mode = 'draw' | 'edit';

type Interaction =
  { kind: 'move'; id: string; lastX: number; lastY: number } | { kind: 'rotate'; id: string };

@Component({
  selector: 'app-polygon-canvas',
  imports: [],
  templateUrl: './polygon-canvas.component.html',
  styleUrl: './polygon-canvas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolygonCanvasComponent implements AfterViewInit, OnDestroy {
  readonly productId = input.required<string>();
  readonly imageUrl = input<string | null>(null);

  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  protected readonly palette = POLYGON_PALETTE;
  protected readonly mode = signal<Mode>('draw');
  protected readonly color = signal<string>(POLYGON_PALETTE[0]);
  protected readonly hasSelection = signal(false);
  protected readonly shapeCount = signal(0);

  private shapes: PolygonShape[] = [];
  private selectedId: string | null = null;
  private draft: NormPoint[] = [];
  private cursor: { x: number; y: number } | null = null;
  private interaction: Interaction | null = null;

  private ctx!: CanvasRenderingContext2D;
  private rect: Rect = { x: 0, y: 0, width: 0, height: 0 };
  private cssW = 0;
  private cssH = 0;
  private image: HTMLImageElement | null = null;
  private imageReady = false;
  private resizeObserver?: ResizeObserver;
  private idCounter = 0;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef().nativeElement;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    this.store
      .select(selectPolygonsByProduct(this.productId()))
      .pipe(take(1))
      .subscribe((shapes) => {
        this.shapes = shapes.map(cloneShape);
        this.shapeCount.set(this.shapes.length);
      });

    this.loadImage();

    this.resizeObserver = new ResizeObserver(() => this.syncSize());
    this.resizeObserver.observe(canvas);
    this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());

    this.syncSize();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  protected setMode(mode: Mode): void {
    this.mode.set(mode);
    this.draft = [];
    if (mode === 'draw') this.select(null);
    this.render();
  }

  protected pickColor(value: string): void {
    this.color.set(value);
    const selected = this.currentSelected();
    if (selected) {
      selected.color = value;
      this.commit(selected);
      this.render();
    }
  }

  protected deleteSelected(): void {
    if (!this.selectedId) return;
    this.store.dispatch(
      PolygonsActions.removePolygon({ productId: this.productId(), shapeId: this.selectedId }),
    );
    this.shapes = this.shapes.filter((s) => s.id !== this.selectedId);
    this.select(null);
    this.shapeCount.set(this.shapes.length);
    this.render();
  }

  protected clearAll(): void {
    this.store.dispatch(PolygonsActions.clearPolygons({ productId: this.productId() }));
    this.shapes = [];
    this.draft = [];
    this.select(null);
    this.shapeCount.set(0);
    this.render();
  }

  protected onPointerDown(event: PointerEvent): void {
    const { x, y } = this.localPoint(event);
    if (this.mode() === 'draw') {
      this.handleDrawClick(x, y);
      return;
    }
    this.handleEditDown(x, y);
    if (this.interaction) {
      this.canvasRef().nativeElement.setPointerCapture?.(event.pointerId);
    }
  }

  protected onPointerMove(event: PointerEvent): void {
    const { x, y } = this.localPoint(event);
    this.cursor = { x, y };

    if (this.interaction?.kind === 'move') {
      const shape = this.shapes.find((s) => s.id === this.interaction!.id);
      if (shape) {
        const model = new PolygonModel(shape);
        shape.points = model.translate(
          this.rect,
          x - this.interaction.lastX,
          y - this.interaction.lastY,
        );
        this.interaction.lastX = x;
        this.interaction.lastY = y;
      }
    } else if (this.interaction?.kind === 'rotate') {
      const shape = this.shapes.find((s) => s.id === this.interaction!.id);
      if (shape) {
        shape.rotation = new PolygonModel(shape).rotationToward(this.rect, x, y);
      }
    } else if (this.mode() === 'edit') {
      this.updateCursorStyle(x, y);
    }
    this.render();
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.interaction) {
      const shape = this.shapes.find((s) => s.id === this.interaction!.id);
      if (shape) this.commit(shape);
      this.interaction = null;
    }
    this.canvasRef().nativeElement.releasePointerCapture?.(event.pointerId);
  }

  protected onDoubleClick(): void {
    if (this.mode() === 'draw') this.finishDraft();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.draft.length) {
      this.draft = [];
      this.render();
    }
  }

  private handleDrawClick(x: number, y: number): void {
    if (!this.insideRect(x, y)) return;

    if (this.draft.length >= 3) {
      const first = this.draft[0];
      const fx = this.rect.x + first.x * this.rect.width;
      const fy = this.rect.y + first.y * this.rect.height;
      if (Math.hypot(x - fx, y - fy) <= CLOSE_SNAP_RADIUS) {
        this.finishDraft();
        return;
      }
    }
    this.draft.push(clamp01(pixelToNorm(this.rect, x, y)));
    this.render();
  }

  private finishDraft(): void {
    if (this.draft.length < 3) return;
    const shape: PolygonShape = {
      id: `poly-${this.productId()}-${this.idCounter++}`,
      points: this.draft.map((p) => ({ ...p })),
      rotation: 0,
      color: this.color(),
    };
    this.shapes.push(shape);
    this.draft = [];
    this.shapeCount.set(this.shapes.length);
    this.store.dispatch(
      PolygonsActions.addPolygon({ productId: this.productId(), shape: cloneShape(shape) }),
    );
    this.select(shape.id);
    this.mode.set('edit');
    this.render();
  }

  private handleEditDown(x: number, y: number): void {
    const selected = this.currentSelected();
    if (selected && new PolygonModel(selected).isOnRotateHandle(this.rect, x, y)) {
      this.interaction = { kind: 'rotate', id: selected.id };
      return;
    }

    const hit = this.topmostAt(x, y);
    if (hit) {
      this.select(hit.id);
      this.interaction = { kind: 'move', id: hit.id, lastX: x, lastY: y };
    } else {
      this.select(null);
    }
    this.render();
  }

  private topmostAt(x: number, y: number): PolygonShape | null {
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      if (new PolygonModel(this.shapes[i]).containsPoint(this.ctx, this.rect, x, y)) {
        return this.shapes[i];
      }
    }
    return null;
  }

  private updateCursorStyle(x: number, y: number): void {
    const canvas = this.canvasRef().nativeElement;
    const selected = this.currentSelected();
    if (selected && new PolygonModel(selected).isOnRotateHandle(this.rect, x, y)) {
      canvas.style.cursor = 'grab';
    } else if (this.topmostAt(x, y)) {
      canvas.style.cursor = 'move';
    } else {
      canvas.style.cursor = 'default';
    }
  }

  private commit(shape: PolygonShape): void {
    this.store.dispatch(
      PolygonsActions.updatePolygon({ productId: this.productId(), shape: cloneShape(shape) }),
    );
  }

  private select(id: string | null): void {
    this.selectedId = id;
    this.hasSelection.set(id !== null);
    const selected = this.currentSelected();
    if (selected) this.color.set(selected.color);
  }

  private currentSelected(): PolygonShape | null {
    return this.shapes.find((s) => s.id === this.selectedId) ?? null;
  }

  private loadImage(): void {
    const url = this.imageUrl();
    if (!url) {
      this.imageReady = false;
      this.render();
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.image = img;
      this.imageReady = true;
      this.syncSize();
    };
    img.onerror = () => {
      this.imageReady = false;
      this.render();
    };
    img.src = url;
  }

  private syncSize(): void {
    const canvas = this.canvasRef().nativeElement;
    this.cssW = canvas.clientWidth;
    this.cssH = canvas.clientHeight;
    if (!this.cssW || !this.cssH) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(this.cssW * dpr);
    canvas.height = Math.round(this.cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.rect = this.computeRect();
    this.render();
  }

  private computeRect(): Rect {
    if (!this.imageReady || !this.image?.naturalWidth) {
      return { x: 0, y: 0, width: this.cssW, height: this.cssH };
    }
    const ar = this.image.naturalWidth / this.image.naturalHeight;
    let w = this.cssW;
    let h = this.cssW / ar;
    if (h > this.cssH) {
      h = this.cssH;
      w = this.cssH * ar;
    }
    return { x: (this.cssW - w) / 2, y: (this.cssH - h) / 2, width: w, height: h };
  }

  private insideRect(x: number, y: number): boolean {
    return (
      x >= this.rect.x &&
      x <= this.rect.x + this.rect.width &&
      y >= this.rect.y &&
      y <= this.rect.y + this.rect.height
    );
  }

  private localPoint(event: PointerEvent | MouseEvent): { x: number; y: number } {
    const bounds = this.canvasRef().nativeElement.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  private render(): void {
    if (!this.ctx || !this.cssW) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    if (this.imageReady && this.image) {
      ctx.drawImage(this.image, this.rect.x, this.rect.y, this.rect.width, this.rect.height);
    } else {
      ctx.fillStyle = '#eceff1';
      ctx.fillRect(0, 0, this.cssW, this.cssH);
      ctx.fillStyle = '#90a4ae';
      ctx.font = '14px Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No image available', this.cssW / 2, this.cssH / 2);
      ctx.textAlign = 'start';
    }

    for (const shape of this.shapes) {
      this.drawShape(shape, shape.id === this.selectedId);
    }
    this.drawDraft();
  }

  private drawShape(shape: PolygonShape, selected: boolean): void {
    const ctx = this.ctx;
    const model = new PolygonModel(shape);
    const path = model.path(this.rect);

    ctx.fillStyle = hexToRgba(shape.color, 0.25);
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = 2;
    ctx.fill(path);
    ctx.stroke(path);

    if (!selected) return;

    const corners = model.frameCorners(this.rect);
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#1a73e8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    corners.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    const handle = model.rotateHandle(this.rect);
    const stem = model.rotateStemAnchor(this.rect);
    ctx.strokeStyle = '#1a73e8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(stem.x, stem.y);
    ctx.lineTo(handle.x, handle.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(handle.x, handle.y, ROTATE_HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#1a73e8';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (const p of model.pixels(this.rect)) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1a73e8';
      ctx.fill();
    }
  }

  private drawDraft(): void {
    if (!this.draft.length) return;
    const ctx = this.ctx;
    const pts = this.draft.map((p) => ({
      x: this.rect.x + p.x * this.rect.width,
      y: this.rect.y + p.y * this.rect.height,
    }));

    ctx.strokeStyle = this.color();
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    if (this.cursor) ctx.lineTo(this.cursor.x, this.cursor.y);
    ctx.stroke();

    const first = pts[0];
    ctx.beginPath();
    ctx.arc(first.x, first.y, CLOSE_SNAP_RADIUS / 2, 0, Math.PI * 2);
    ctx.fillStyle = this.draft.length >= 3 ? this.color() : '#ffffff';
    ctx.strokeStyle = this.color();
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = this.color();
      ctx.fill();
    }
  }
}

function cloneShape(shape: PolygonShape): PolygonShape {
  return { ...shape, points: shape.points.map((p) => ({ ...p })) };
}

function clamp01(p: NormPoint): NormPoint {
  return { x: Math.min(1, Math.max(0, p.x)), y: Math.min(1, Math.max(0, p.y)) };
}

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
