import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Product } from '../../../core/models/product.model';
import { PolygonCanvasComponent } from '../polygon-canvas/polygon-canvas.component';

@Component({
  selector: 'app-product-dialog.component',
  imports: [CommonModule, MatDialogModule, MatButtonModule, PolygonCanvasComponent],
  templateUrl: './product-dialog.component.html',
  styleUrl: './product-dialog.component.scss',
})
export class ProductDialogComponent {
  private dialogRef = inject(MatDialogRef<ProductDialogComponent>);
  protected readonly data = inject<{ product: Product }>(MAT_DIALOG_DATA);

  close(): void {
    this.dialogRef.close();
  }
}
