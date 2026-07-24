import { Component, inject, Input, Output, EventEmitter, signal, computed, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Database } from '../../../../services/db';
import { MentionService } from '../../../../services/mention';
import { SignalChannel } from '../../../../interfaces/db/db-channels';
import { Profile } from '../../../../interfaces/profile';
import { MentionSuggestions } from '../../mention-suggestions/mention-suggestions';

@Component({
  selector: 'app-add-people-dialog',
  imports: [FormsModule, MentionSuggestions],
  templateUrl: './add-people-dialog.html',
  styleUrl: './add-people-dialog.css',
})
export class AddPeopleDialog {
  @Input() channelInfo: SignalChannel = null
  @Output() closed = new EventEmitter<void>()

  db = inject(Database)
  mention = inject(MentionService)

  name: WritableSignal<string> = signal('')
  selectedProfile: WritableSignal<Profile | null> = signal(null)

  suggestions = computed(() =>
    this.selectedProfile() ? [] : this.mention.filterProfiles(this.name()))

  onNameChange(value: string) {
    this.name.set(value)
    this.selectedProfile.set(null)
  }

  selectProfile(profile: Profile) {
    this.selectedProfile.set(profile)
    this.name.set(profile.name)
  }

  async addMember() {
    const channelId = this.channelInfo?.id
    if (!channelId) return

    const profile = this.selectedProfile()
      ?? this.db.profiles().find(p => p.name.trim().toLowerCase() === this.name().trim().toLowerCase())
    if (profile) await this.db.addChannelMember(channelId, profile.id)

    this.closed.emit()
  }
}
