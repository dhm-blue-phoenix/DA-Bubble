import { Component, Input, Output, EventEmitter } from '@angular/core';
import { SignalChannel } from '../../../../interfaces/db/db-channels';

@Component({
  selector: 'app-dialogchannel',
  imports: [],
  templateUrl: './dialog-channel.html',
  styleUrl: './dialog-channel.css',
})
export class DialogChannel {
  @Input() channelInfo: SignalChannel = null
  @Output() closed = new EventEmitter<void>()
}
