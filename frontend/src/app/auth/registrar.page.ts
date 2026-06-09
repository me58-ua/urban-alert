import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AppMenuComponent } from '../shared/app-menu/app-menu.component';

@Component({
  selector: 'app-registrar',
  templateUrl: 'registrar.page.html',
  styleUrls: ['auth.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, AppMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarPage {
  readonly brandMarkUrl =
    'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  name = '';
  email = '';
  password = '';
  acceptTerms = false;

  submit() {
    console.log('Registro ciudadano', {
      name: this.name,
      email: this.email,
      acceptTerms: this.acceptTerms,
    });
  }
}

export default RegistrarPage;
