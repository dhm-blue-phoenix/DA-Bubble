import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SignInService } from  '../../../../services/singin_service'
import { Database } from '../../../../services/db';

@Component({
  selector: 'app-select-avatar',
  imports: [RouterLink],
  templateUrl: './select-avatar.html',
  styleUrl: './select-avatar.css',
})
export class SelectAvatar {
    signin = inject(SignInService)
    db = inject(Database)
    avatars = [1, 2, 3, 4, 5, 6]
    sel_avatar = ''

    select_Avatar(avatar:number){
      this.sel_avatar = ''
      this.sel_avatar = this.sel_avatar + avatar
      this.signin.data.set({
      ...this.signin.data(),
      avatar: this.sel_avatar
    })
    }

    singin(){
      console.log(this.signin.data())
      this.db.register(
        this.signin.data().email,
        this.signin.data().password,
        this.signin.data().name,
        this.signin.data().avatar,
    )
    }
}
