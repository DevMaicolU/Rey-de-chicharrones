import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './toast/toast';

@Component({
  selector: 'app-principal',
  imports: [RouterOutlet, ToastComponent],
  template: `<router-outlet /><app-toast />`,
  styleUrl: './app.css'
})
export class App {
}
