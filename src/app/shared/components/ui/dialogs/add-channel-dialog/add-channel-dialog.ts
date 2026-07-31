import { Component, inject, Output, EventEmitter } from '@angular/core';
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

  @Output() closed = new EventEmitter<void>()

  async add_new_Channel (){
    const success = await this.db.newChannel(this.db.getCurrentUserId(), this.channel_name, this.channel_descritpion)
    try{
      this.db.getChannels(this.db.getCurrentUserId())
      if (success) 
        this.closed.emit()
    }
    catch{
      console.warn("Channel not create")
    }      
  }
}
