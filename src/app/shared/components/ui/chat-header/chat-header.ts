import { Component, Input, Output, EventEmitter, inject, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Profile } from '../../../interfaces/profile';
import { SignalChannel, ChannelIdAndName } from '../../../interfaces/db/db-channels';
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
  @Output() openAddMember = new EventEmitter<HTMLElement>()
  @Output() openMembers = new EventEmitter<HTMLElement>()
  @Output() openSelection = new EventEmitter<{ type: 'chat' | 'channel'; id: string }>()

  mention: MentionController = inject(MentionService).createController(true)

  searchFocused: WritableSignal<boolean> = signal(false)

  onSearchFieldClick(input: HTMLInputElement) {
    this.mention.onInput(input)
  }

  onSearchFocus() {
    this.searchFocused.set(true)
  }

  closeMentionDropdown() {
    setTimeout(() => {
      this.mention.trigger.set(null)
      this.searchFocused.set(false)
    }, 150)
  }

  onSelectProfile(profile: Profile) {
    this.mention.selectProfile(profile)
    this.openSelection.emit({ type: 'chat', id: profile.id })
  }

  onSelectChannel(channel: ChannelIdAndName) {
    this.mention.selectChannel(channel)
    this.openSelection.emit({ type: 'channel', id: channel.id })
  }
}
