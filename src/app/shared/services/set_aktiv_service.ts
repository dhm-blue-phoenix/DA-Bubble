import { Injectable, signal} from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ActiveService {
    aktivDM = signal<string | null>(null);

    setAktivDM(id: string) {
        this.aktivDM.set(id);
        console.log(id)
    }
}