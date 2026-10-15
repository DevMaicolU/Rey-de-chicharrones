import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../servicios/auth.service';
import { ThemeService } from '../servicios/theme.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html'
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly theme = inject(ThemeService);

  username = '';
  password = '';
  error = '';

  ngOnInit(): void {
    // Si ya hay una sesión activa no tiene sentido mostrar el formulario.
    if (this.auth.activeUser) this.router.navigateByUrl(this.auth.rutaInicio);
  }

  ingresar(): void {
    const user = this.auth.login(this.username, this.password);
    if (!user) {
      this.error = 'Usuario o contraseña incorrectos.';
      return;
    }
    this.error = '';
    this.router.navigateByUrl(this.auth.rutaInicio);
  }
}
