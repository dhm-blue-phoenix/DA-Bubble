import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Database } from '../../../../services/db';
import { SignalChannel } from '../../../../interfaces/db/db-channels';

@Component({
  selector: 'app-add-people-dialog',
  imports: [FormsModule],
  templateUrl: './add-people-dialog.html',
  styleUrl: './add-people-dialog.css',
})
export class AddPeopleDialog {
  @Input() channelInfo: SignalChannel = null
  @Output() closed = new EventEmitter<void>()

  name = ""

  db = inject(Database)

  async addMember() {
    const trimmed = this.name.trim()
    const channelId = this.channelInfo?.id
    if (!trimmed || !channelId) return

    const profile = this.db.profiles().find(p => p.name.trim().toLowerCase() === trimmed.toLowerCase())
    if (profile) await this.db.addChannelMember(channelId, profile.id)

    this.closed.emit()
  }
}
