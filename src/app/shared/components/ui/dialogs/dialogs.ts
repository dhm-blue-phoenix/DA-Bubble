import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DialogChannel } from './dialog-channel/dialog-channel';
import { AddChannelDialog } from './add-channel-dialog/add-channel-dialog';
import { SignalChannel } from '../../../interfaces/db/db-channels';
import { Profile } from '../../../interfaces/profile';

@Component({
  selector: 'app-dialogs',
  imports: [DialogChannel, AddChannelDialog],
  templateUrl: './dialogs.html',
  styleUrl: './dialogs.css',
})
export class Dialogs {

  @Input() mode: 'editChannel' | 'addChannel' | null = null
  @Input() channelInfo: SignalChannel = null
  @Input() channelCreator: Profile | null = null
  @Output() closed = new EventEmitter<void>()
  @Output() save = new EventEmitter<{ name: string; description: string }>()
  @Output() leave = new EventEmitter<void>()
}
