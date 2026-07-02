import { Component, input } from '@angular/core';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-card',
  imports: [],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
})
export class ProductCardComponent {
  product = input.required<Product>();

  setDefaultCover(event: Event): void {
    const element = event.target as HTMLImageElement;
    element.src = 'images/no-cover.png';
  }
}
