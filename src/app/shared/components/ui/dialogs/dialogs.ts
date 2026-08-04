import { Component, Input, Output, EventEmitter, ElementRef, viewChild, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { EdithannelDialog } from './edit-channel-dialog/edit-channel-dialog';
import { AddChannelDialog } from './add-channel-dialog/add-channel-dialog';
import { AddPeopleDialog } from './add-people-dialog/add-people-dialog';
import { MembersDialog } from './members-dialog/members-dialog';
import { ProfileDialog } from './profile-dialog/profile-dialog';
import { SignalChannel } from '../../../interfaces/db/db-channels';
import { Profile } from '../../../interfaces/profile';

@Component({
  selector: 'app-dialogs',
  imports: [EdithannelDialog, AddChannelDialog, AddPeopleDialog, MembersDialog, ProfileDialog],
  templateUrl: './dialogs.html',
  styleUrl: './dialogs.css',
})
export class Dialogs implements AfterViewInit, OnChanges {

  @Input() mode: 'editChannel' | 'addChannel' | 'addMember' | 'members' | null = null
  @Input() channelInfo: SignalChannel = null
  @Input() channelCreator: Profile | null = null
  @Input() memberProfiles: Profile[] = []
  @Input() profileUser: Profile | null = null

  @Output() closed = new EventEmitter<void>()
  @Output() save = new EventEmitter<{ name: string; description: string }>()
  @Output() leave = new EventEmitter<void>()
  @Output() addMember = new EventEmitter<void>()
  @Output() openProfile = new EventEmitter<Profile>()
  @Output() closedProfile = new EventEmitter<void>()
  @Output() message = new EventEmitter<string>()

  dialogPanel = viewChild<ElementRef<HTMLDialogElement>>('dialogPanelRef')
  profileDialogPanel = viewChild<ElementRef<HTMLDialogElement>>('profileDialogPanelRef')

  /** Öffnet den Haupt-Dialog nativ, sobald die View bereit ist. */
  ngAfterViewInit() {
    this.dialogPanel()?.nativeElement.showModal()
  }

  /** Der Profil-Dialog kommt/geht unabhängig vom Haupt-Dialog (siehe profileUser), daher eigenes showModal() bei jedem Öffnen. */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['profileUser'] && this.profileUser)
      queueMicrotask(() => this.profileDialogPanel()?.nativeElement.showModal())
  }

  /** Schließt den Dialog, wenn der Klick auf den Dialog selbst (= Backdrop) statt auf ein Kind-Element trifft. */
  onBackdropClick(event: MouseEvent, dialog: HTMLDialogElement) {
    if (event.target === dialog) dialog.close()
  }
}
