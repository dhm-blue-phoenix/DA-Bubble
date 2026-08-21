import { Component, Input, Output, EventEmitter } from '@angular/core';
import { SearchResultView } from '../../../interfaces/messages';

@Component({
  selector: 'app-search-suggestions',
  imports: [],
  templateUrl: './search-suggestions.html',
  styleUrl: './search-suggestions.css',
})
export class SearchSuggestions {
  @Input() results: SearchResultView[] = []
  @Input() direction: 'up' | 'down' = 'down'

  @Output() select = new EventEmitter<SearchResultView>()
}
