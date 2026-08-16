import { Component, computed, inject, Output, EventEmitter, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Database } from '../../../services/db';
import { FormsModule, NgModel } from '@angular/forms';
import { ActiveService } from '../../../services/set_aktiv_service';

import { Profile } from '../../../interfaces/profile';
import { SignalChannel, ChannelIdAndName } from '../../../interfaces/db/db-channels';
import { MentionService, MentionController } from '../../../services/mention';
import { SelectionSuggestions } from '../../ui/selection-suggestions/selection-suggestions';


@Component({
  selector: 'app-header-component',
  imports: [FormsModule, SelectionSuggestions],
  templateUrl: './header-component.html',
  styleUrl: './header-component.css',
})
export class HeaderComponent {

  dialog_open = false

  @Output() openUserProfile = new EventEmitter<void>()

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

  onSearchFieldClick(input: HTMLInputElement) {
    this.mention.onInput(input)
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
