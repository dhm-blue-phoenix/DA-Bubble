import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SignalChannel } from '../../../../interfaces/db/db-channels';
import { Profile } from '../../../../interfaces/profile';

@Component({
  selector: 'app-edit-channel-dialog',
  imports: [FormsModule],
  templateUrl: './edit-channel-dialog.html',
  styleUrl: './edit-channel-dialog.css',
})
export class EdithannelDialog {
  @Input() channelCreator: Profile | null = null
  @Output() closed = new EventEmitter<void>()
  @Output() save = new EventEmitter<{ name: string; description: string }>()
  @Output() leave = new EventEmitter<void>()

  editingName = false
  editingDescription = false
  nameDraft = ''
  descriptionDraft = ''

  private _channelInfo: SignalChannel = null

  @Input() set channelInfo(value: SignalChannel) {
    this._channelInfo = value
    if (!this.editingName) this.nameDraft = value?.name ?? ''
    if (!this.editingDescription) this.descriptionDraft = value?.description ?? ''
  }
  get channelInfo(): SignalChannel {
    return this._channelInfo
  }

  toggleEditName() {
    if (this.editingName) this.save.emit({ name: this.nameDraft, description: this.descriptionDraft })
    this.editingName = !this.editingName
  }

  toggleEditDescription() {
    if (this.editingDescription) this.save.emit({ name: this.nameDraft, description: this.descriptionDraft })
    this.editingDescription = !this.editingDescription
  }
}
