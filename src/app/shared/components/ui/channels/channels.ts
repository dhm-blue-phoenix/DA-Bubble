import { Component, Input } from '@angular/core';
import { Channel } from '../../feature/main-component/main-component';

@Component({
  selector: 'app-channels',
  imports: [],
  templateUrl: './channels.html',
  styleUrl: './channels.css',
})
export class Channels {
  @Input() ch!: Channel
}
