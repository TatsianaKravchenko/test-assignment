import { Component, DestroyRef, inject, output } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { Product } from '../../../../core/models/product.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-search-input',
  imports: [MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './search-input-component.html',
  styleUrl: './search-input-component.scss',
})
export class SearchInputComponent {
  searchResults = output<Product[]>();
  searching = output<boolean>();

  searchControl = new FormControl('');
  private destroyRef = inject(DestroyRef);

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(1000),
        distinctUntilChanged(),
        tap(() => this.searching.emit(true)),
        switchMap((query: string | null) => this.apiService.search(query || '')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (results: Product[]) => {
          this.searchResults.emit(results);
          this.searching.emit(false);
        },
        error: (err) => {
          console.error('Error', err);
          this.searching.emit(false);
        },
      });
  }
}
