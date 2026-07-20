import { Component, inject } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { Database } from '../../../../services/db';

@Component({
  selector: 'app-add-channel-dialog',
  imports: [FormsModule],
  templateUrl: './add-channel-dialog.html',
  styleUrl: './add-channel-dialog.css',
})
export class AddChannelDialog {

  channel_name = ""
  channel_descritpion = ""

  db = inject(Database)

  add_new_Channel (){
    this.db.newChannel(this.db.getCurrentUserId(), this.channel_name, this.channel_descritpion)
  }
}
