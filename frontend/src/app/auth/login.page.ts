import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AppMenuComponent } from '../shared/app-menu/app-menu.component';

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

  constructor(private readonly router: Router) {}

  submit() {
    const role = this.resolveRole();
    localStorage.setItem('urban-alert-role', role);
    console.log('Inicio de sesion', {
      email: this.email,
      remember: this.remember,
      role,
    });
    void this.router.navigateByUrl(role === 'admin' ? '/admin' : '/home');
  }

  private resolveRole(): 'admin' | 'user' {
    const storedRole = localStorage.getItem('urban-alert-login-role');
    if (storedRole === 'admin' || storedRole === 'user') return storedRole;
    return this.email.trim().toLowerCase().includes('admin') ? 'admin' : 'user';
  }
}

export default LoginPage;
