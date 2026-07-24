import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { SignInService } from  '../../../../services/singin_service'
import { Database } from '../../../../services/db';
import { UserFeedback } from '../user-feedback/user-feedback';


@Component({
  selector: 'app-select-avatar',
  imports: [RouterLink, UserFeedback],
  templateUrl: './select-avatar.html',
  styleUrl: './select-avatar.css',
})
export class SelectAvatar {
    signin = inject(SignInService)
    db = inject(Database)
    router = inject(Router)
    show_feedback = signal(false)
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

    async singin(){
    const { email, password, name, avatar } = this.signin.data()
    await this.db.register(email, password, name, avatar)

    this.show_feedback.set(true)
    }
}
