import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Profile } from '../../../interfaces/profile';
import { ChannelIdAndName } from '../../../interfaces/db/db-channels';

@Component({
  selector: 'app-selection-suggestions',
  imports: [],
  templateUrl: './selection-suggestions.html',
  styleUrl: './selection-suggestions.css',
})
export class SelectionSuggestions {
  @Input() type: 'member' | 'channel' = 'member'
  @Input() profiles: Profile[] = []
  @Input() channels: ChannelIdAndName[] = []
  @Input() activeIndex = 0
  @Input() direction: 'up' | 'down' = 'down'

  @Output() selectProfile = new EventEmitter<Profile>()
  @Output() selectChannel = new EventEmitter<ChannelIdAndName>()
}
