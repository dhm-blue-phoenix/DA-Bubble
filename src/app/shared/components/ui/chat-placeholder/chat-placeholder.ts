import { Component, Input } from '@angular/core';
import { Profile } from '../../../interfaces/profile';
import { SignalChannel } from '../../../interfaces/db/db-channels';

@Component({
  selector: 'app-chat-placeholder',
  imports: [],
  templateUrl: './chat-placeholder.html',
  styleUrl: './chat-placeholder.css',
})
export class ChatPlaceholder {
  @Input() profile: Profile | null = null
  @Input() isSelfChat = false
  @Input() type: 'channel' | 'chat' | 'search' | null = null
  @Input() channel: SignalChannel = null
}
