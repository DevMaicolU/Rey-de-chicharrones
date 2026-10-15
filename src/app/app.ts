import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './toast/toast';
import { ThemeService } from './servicios/theme.service';

@Component({
  selector: 'app-principal',
  imports: [RouterOutlet, ToastComponent],
  template: `<router-outlet /><app-toast />`,
  styleUrl: './app.css'
})
export class App {
  private readonly theme = inject(ThemeService);
}

