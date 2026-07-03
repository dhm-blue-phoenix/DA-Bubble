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

    singin(){
      console.log(this.signin.data())
    //   this.db.register(
    //     this.signin.data().email,
    //     this.signin.data().password,
    //     this.signin.data().name,
    //     this.signin.data().avatar,
    // )
    this.show_feedback.set(true)
    setTimeout(() => {
      this.show_feedback.set(false), 
      this.router.navigate(['/'])
    },
      3000)
    }
}
