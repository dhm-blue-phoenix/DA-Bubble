import { Component, computed, inject, signal, WritableSignal, Output, EventEmitter, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Database } from '../../../services/db';
import { FormsModule, NgModel } from '@angular/forms';
import { ActiveService } from '../../../services/set_aktiv_service';

import { Profile } from '../../../interfaces/profile';
import { SignalChannel, ChannelIdAndName } from '../../../interfaces/db/db-channels';
import { MentionService, MentionController } from '../../../services/mention';
import { SelectionSuggestions } from '../../ui/selection-suggestions/selection-suggestions';
import { SearchMessages, SearchResultView } from '../../../interfaces/messages'


@Component({
  selector: 'app-header-component',
  imports: [FormsModule, SelectionSuggestions],
  templateUrl: './header-component.html',
  styleUrl: './header-component.css',
})
export class HeaderComponent {

  dialog_open = false

  @Output() openUserProfile = new EventEmitter<void>()

  searchResults: WritableSignal<SearchResultView[]> = signal([])

  router = inject(Router)
  db = inject(Database)
  active = inject(ActiveService);

  currentUser = computed(() => this.db.profiles().find(p => p.id === this.db.getCurrentUserId()) ?? null)

  toggle_Dialog() {
    this.dialog_open = ! this.dialog_open
  }

  openProfile() {
    this.openUserProfile.emit()
    this.dialog_open = false
  }

  logout(){
    this.db.logout();
    this.router.navigate(['/'])
  }

  @Input() type: 'channel' | 'chat' | 'search' | null = null
  @Input() dmPartner: Profile | null = null
  @Input() isSelfChat: boolean = false
  @Input() channelInfo: SignalChannel = null
  @Input() memberProfiles: Profile[] = []

  @Output() openChannelInfo = new EventEmitter<void>()
  @Output() openAddMember = new EventEmitter<void>()
  @Output() openMembers = new EventEmitter<void>()
  @Output() openSelection = new EventEmitter<{ type: 'chat' | 'channel'; id: string }>()

  mention: MentionController = inject(MentionService).createController(true)

  async onSearchFieldClick(input: HTMLInputElement) {
    this.mention.onInput(input)
    if (this.mention.trigger() === null && this.mention.text.length > 0){
      const result = await this.db.searchMsg(this.mention.text)
      if (result){
        this.searchResults.set(this.search_content(result))
      }
      else {
        this.searchResults.set([])
      }
    }
  }

  onSelectProfile(profile: Profile) {
    this.mention.selectProfile(profile)
    this.openSelection.emit({ type: 'chat', id: profile.id })
  }

  onSelectChannel(channel: ChannelIdAndName) {
    this.mention.selectChannel(channel)
    this.openSelection.emit({ type: 'channel', id: channel.id })
  }

  search_content(results: SearchMessages): SearchResultView[] {
    const views: SearchResultView[] = []

    for (const message of results) {
      const date = new Date(message.created_at).toLocaleDateString('de-DE')

      if (message.channel_id) {
        const channel = this.db.channels().find(channel => channel.id === message.channel_id)
        views.push({
          id: message.id,
          content: message.content,
          label: channel ? `# ${channel.name}` : 'Thread',
          date,
          type: 'channel',
          targetId: message.channel_id,
        })
      } else if (message.chat_id) {
        views.push({
          id: message.id,
          content: message.content,
          label: 'Direktnachricht',
          date,
          type: 'chat',
          targetId: message.chat_id,
        })
      }
    }
    return views
  }

}
