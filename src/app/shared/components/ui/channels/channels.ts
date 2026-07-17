import { Component, Input } from '@angular/core';
import { ChannelIdAndName } from '../../../interfaces/db/db-channels';

@Component({
  selector: 'app-channels',
  imports: [],
  templateUrl: './channels.html',
  styleUrl: './channels.css',
})
export class Channels {
  @Input() ch!: ChannelIdAndName
  @Input() isActive: boolean = false
}
