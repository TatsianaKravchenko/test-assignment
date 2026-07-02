import { Injectable } from '@angular/core';
import { ProductPolygons } from '../models/polygon.model';

const STORAGE_KEY = 'product-polygons';

@Injectable({ providedIn: 'root' })
export class PolygonStorageService {
  load(): ProductPolygons[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ProductPolygons[]) : [];
    } catch {
      return [];
    }
  }

  save(entries: ProductPolygons[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.warn('[PolygonStorage] Failed to persist polygons:', error);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }
}
