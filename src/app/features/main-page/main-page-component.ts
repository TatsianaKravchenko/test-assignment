import { ChangeDetectorRef, Component } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-main-page-component',
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './main-page-component.html',
  styleUrl: './main-page-component.scss',
})
export class MainPageComponent {
  products: Product[] = [];

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.apiService.search('').subscribe((data) => {
      this.products = data;
      this.cdr.detectChanges();
    });
  }

  updateList(results: Product[]): void {
    this.products = results;
    this.cdr.detectChanges();
  }

  openDetails(product: Product): void {
    console.log('product', product);
  }

  setDefaultCover(event: Event): void {
    const element = event.target as HTMLImageElement;
    const pathToImage = 'images/no-cover.png';

    if (element.src.includes(pathToImage)) {
      element.src = '';
      return;
    }

    element.src = pathToImage;
  }
}
