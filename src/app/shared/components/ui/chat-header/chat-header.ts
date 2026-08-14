import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Profile } from '../../../interfaces/profile';
import { SignalChannel } from '../../../interfaces/db/db-channels';
import { MentionService, MentionController } from '../../../services/mention';
import { SelectionSuggestions } from '../selection-suggestions/selection-suggestions';

@Component({
  selector: 'app-chat-header',
  imports: [FormsModule, SelectionSuggestions],
  templateUrl: './chat-header.html',
  styleUrl: './chat-header.css',
})
export class ChatHeader {
  @Input() type: 'channel' | 'chat' | 'search' | null = null
  @Input() dmPartner: Profile | null = null
  @Input() isSelfChat: boolean = false
  @Input() channelInfo: SignalChannel = null
  @Input() memberProfiles: Profile[] = []

  @Output() openChannelInfo = new EventEmitter<void>()
  @Output() openAddMember = new EventEmitter<void>()
  @Output() openMembers = new EventEmitter<void>()

  mention: MentionController = inject(MentionService).createController()
}
