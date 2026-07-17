import { Component, Input } from '@angular/core';
import { Profile } from '../../../interfaces/profile';
import { SignalChannel } from '../../../interfaces/db/db-channels';

@Component({
  selector: 'app-chat-header',
  imports: [],
  templateUrl: './chat-header.html',
  styleUrl: './chat-header.css',
})
export class ChatHeader {
  @Input() type: 'channel' | 'chat' = 'channel'
  @Input() dmPartner: Profile | null = null
  @Input() isSelfChat: boolean = false
  @Input() channelInfo: SignalChannel = null
  @Input() memberProfiles: Profile[] = []
}
