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

  suggestions = computed(() => {
    if (this.selectedProfile()) return []
    return this.mention.filterProfiles(this.name()).filter(p => !this.isMember(p.id))
  })

  isMember(profileId: string): boolean {
    return this.channelInfo?.channel_members?.some(m => m.user_id === profileId) ?? false
  }

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
    if (profile && !this.isMember(profile.id)) await this.db.addChannelMember(channelId, profile.id)

    this.closed.emit()
  }
}
