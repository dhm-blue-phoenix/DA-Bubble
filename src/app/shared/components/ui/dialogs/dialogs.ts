import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DialogChannel } from './dialog-channel/dialog-channel';
import { SignalChannel } from '../../../interfaces/db/db-channels';
import { Profile } from '../../../interfaces/profile';

@Component({
  selector: 'app-dialogs',
  imports: [DialogChannel],
  templateUrl: './dialogs.html',
  styleUrl: './dialogs.css',
})
export class Dialogs {
  @Input() channelInfo: SignalChannel = null
  @Input() channelCreator: Profile | null = null
  @Output() closed = new EventEmitter<void>()
  @Output() save = new EventEmitter<{ name: string; description: string }>()
  @Output() leave = new EventEmitter<void>()
}
