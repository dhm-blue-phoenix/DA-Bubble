import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DialogChannel } from './dialog-channel/dialog-channel';
import { SignalChannel } from '../../../interfaces/db/db-channels';

@Component({
  selector: 'app-dialogs',
  imports: [DialogChannel],
  templateUrl: './dialogs.html',
  styleUrl: './dialogs.css',
})
export class Dialogs {
  @Input() channelInfo: SignalChannel = null
  @Output() closed = new EventEmitter<void>()
}
