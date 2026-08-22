import { Component, inject, Input, Output, EventEmitter, signal, computed, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Database } from '../../../../services/db';
import { MentionService } from '../../../../services/mention';
import { SignalChannel } from '../../../../interfaces/db/db-channels';
import { Profile } from '../../../../interfaces/profile';
import { SelectionSuggestions } from '../../selection-suggestions/selection-suggestions';

@Component({
  selector: 'app-add-people-dialog',
  imports: [FormsModule, SelectionSuggestions],
  templateUrl: './add-people-dialog.html',
  styleUrl: './add-people-dialog.css',
})
export class AddPeopleDialog {
  @Input() channelInfo: SignalChannel = null
  @Output() closed = new EventEmitter<void>()

  database = inject(Database)
  mentionService = inject(MentionService)

  searchText: WritableSignal<string> = signal('')
  selectedProfiles: WritableSignal<Profile[]> = signal([])

  suggestions = computed(() => {
    return this.mentionService.filterProfiles(this.searchText())
      .filter(profile => !this.isMember(profile.id))
      .filter(profile => !this.isSelected(profile.id))
  })

  isMember(profileId: string): boolean {
    return this.channelInfo?.channel_members?.some(member => member.user_id === profileId) ?? false
  }

  isSelected(profileId: string): boolean {
    return this.selectedProfiles().some(profile => profile.id === profileId)
  }

  onSearchTextChange(value: string) {
    this.searchText.set(value)
  }

  selectProfile(profile: Profile) {
    if (!this.isSelected(profile.id)) this.selectedProfiles.update(profiles => [...profiles, profile])
    this.searchText.set('')
  }

  removeSelected(profile: Profile) {
    this.selectedProfiles.update(profiles => profiles.filter(selected => selected.id !== profile.id))
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') 
      return
    event.preventDefault()

    const topSuggestion = this.suggestions()[0]
    if (topSuggestion) this.selectProfile(topSuggestion)
    else if (this.selectedProfiles().length > 0) this.addMembers()
  }

  async addMembers() {
    const channelId = this.channelInfo?.id
    if (!channelId) return

    for (const profile of this.selectedProfiles()) {
      if (!this.isMember(profile.id)) await this.database.addChannelMember(channelId, profile.id)
    }

    this.closed.emit()
    this.database.getChannelContent(channelId)
  }
}
