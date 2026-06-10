import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { switchMap } from 'rxjs';
import { AppMenuComponent } from '../shared/app-menu/app-menu.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['auth.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, AppMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  readonly brandMarkUrl =
    'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  email = '';
  password = '';
  remember = true;
  error = '';
  loading = false;

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  submit() {
    this.error = '';
    this.loading = true;
    this.auth
      .login(this.email, this.password)
      .pipe(switchMap(() => this.auth.me()))
      .subscribe({
        next: (user) => {
          this.loading = false;
          void this.router.navigateByUrl(
            user.rol === 'admin' ? '/admin' : '/home',
          );
        },
        error: () => {
          this.loading = false;
          this.error = 'Credenciales incorrectas. Inténtalo de nuevo.';
          this.cdr.markForCheck();
        },
      });
  }
}

export default LoginPage;
