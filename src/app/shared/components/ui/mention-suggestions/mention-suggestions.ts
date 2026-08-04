import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Profile } from '../../../interfaces/profile';

@Component({
  selector: 'app-mention-suggestions',
  imports: [],
  templateUrl: './mention-suggestions.html',
  styleUrl: './mention-suggestions.css',
})
export class MentionSuggestions {
  @Input() results: Profile[] = []
  @Input() activeIndex = 0
  @Output() select = new EventEmitter<Profile>()
}
