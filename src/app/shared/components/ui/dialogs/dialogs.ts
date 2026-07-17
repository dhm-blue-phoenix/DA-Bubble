import { Component } from '@angular/core';
import { DialogChannel } from './dialog-channel/dialog-channel';
import { Channels } from "../channels/channels";

@Component({
  selector: 'app-dialogs',
  imports: [DialogChannel],
  templateUrl: './dialogs.html',
  styleUrl: './dialogs.css',
})
export class Dialogs {}
