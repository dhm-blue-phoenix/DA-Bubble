import { Injectable, signal} from '@angular/core';


@Injectable({ providedIn: 'root'})
export class SignInService {
    data = signal ({
        email:'',
        password:'',
        name:'',
        avatar:''
    })
}