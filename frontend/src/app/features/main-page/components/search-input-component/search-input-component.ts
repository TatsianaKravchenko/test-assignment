import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import * as ProductsActions from '../../../../core/store/products/products.actions';
import { selectSearchHistory } from '../../../../core/store/products/products.selectors';

const MAX_RECENT_QUERIES = 7;

@Component({
  selector: 'app-search-input',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatIconModule,
  ],
  templateUrl: './search-input-component.html',
  styleUrl: './search-input-component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchInputComponent implements OnInit {
  private store = inject(Store);
  private destroyRef = inject(DestroyRef);

  searchControl = new FormControl('');
  allHistory = this.store.selectSignal(selectSearchHistory);

  private readonly searchValue = toSignal(this.searchControl.valueChanges, { initialValue: '' });

  filteredHistory = computed(() => {
    const rawValue = this.searchValue() || '';
    const historyList = this.allHistory();

    if (!rawValue.trim()) {
      return historyList.slice(0, MAX_RECENT_QUERIES);
    }

    const searchTokens = rawValue
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 0);

    return historyList.filter((item) => {
      const itemQuery = item.query.toLowerCase();
      return searchTokens.every((token) => itemQuery.includes(token));
    });
  });

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.store.dispatch(ProductsActions.setSearchValue({ searchValue: value || '' }));
      });
  }

  onOptionSelected(query: string): void {
    this.searchControl.setValue(query, { emitEvent: true });
  }
}
