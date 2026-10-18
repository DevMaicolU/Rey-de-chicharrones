import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../servicios/auth.service';
import { ThemeService } from '../servicios/theme.service';
import { LOGO_OFICIAL } from '../util/imagen';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html'
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly theme = inject(ThemeService);
  readonly logoOficial = LOGO_OFICIAL;

  username = '';
  password = '';
  error = '';
  usernameTouched = false;
  passwordTouched = false;

  ngOnInit(): void {
    // Si ya hay una sesión activa no tiene sentido mostrar el formulario.
    if (this.auth.activeUser) this.router.navigateByUrl(this.auth.rutaInicio);
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('LOGO_OFICIAL.jpeg')) {
      img.src = 'Images/LOGO_OFICIAL.jpeg';
    }
  }

  ingresar(): void {
    this.usernameTouched = true;
    this.passwordTouched = true;
    this.error = '';

    const cleanUser = this.username.trim();
    if (!cleanUser && !this.password) {
      this.error = 'El campo Usuario es obligatorio.';
      return;
    }
    if (!cleanUser) {
      this.error = 'El campo Usuario es obligatorio.';
      return;
    }
    if (!this.password) {
      this.error = 'El campo Contraseña es obligatorio.';
      return;
    }

    try {
      const user = this.auth.login(cleanUser, this.password);
      if (!user) {
        this.error = 'El usuario o la contraseña son incorrectos.';
        return;
      }
      this.error = '';
      this.router.navigateByUrl(this.auth.rutaInicio);
    } catch {
      this.error = 'No fue posible conectar con el servidor. Inténtelo nuevamente.';
    }
  }
}

