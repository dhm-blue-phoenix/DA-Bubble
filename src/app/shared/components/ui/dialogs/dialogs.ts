import { Component, Input, Output, EventEmitter } from '@angular/core';
import { EdithannelDialog } from './edit-channel-dialog/edit-channel-dialog';
import { AddChannelDialog } from './add-channel-dialog/add-channel-dialog';
import { AddPeopleDialog } from './add-people-dialog/add-people-dialog';
import { MembersDialog } from './members-dialog/members-dialog';
import { SignalChannel } from '../../../interfaces/db/db-channels';
import { Profile } from '../../../interfaces/profile';

@Component({
  selector: 'app-dialogs',
  imports: [EdithannelDialog, AddChannelDialog, AddPeopleDialog, MembersDialog],
  templateUrl: './dialogs.html',
  styleUrl: './dialogs.css',
})
export class Dialogs {

  @Input() mode: 'editChannel' | 'addChannel' | 'addMember' | 'members' | null = null
  @Input() channelInfo: SignalChannel = null
  @Input() channelCreator: Profile | null = null
  @Input() memberProfiles: Profile[] = []
  @Output() closed = new EventEmitter<void>()
  @Output() save = new EventEmitter<{ name: string; description: string }>()
  @Output() leave = new EventEmitter<void>()
  @Output() addMember = new EventEmitter<void>()
}
