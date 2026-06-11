import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { HeaderComponent } from '../shared/header/header.component';
import { FooterComponent } from '../shared/footer/footer.component';
import { UiButtonComponent } from '../shared/ui-button/ui-button.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-registrar',
  templateUrl: 'registrar.page.html',
  styleUrls: ['auth.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, HeaderComponent, FooterComponent, UiButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarPage {
  name = '';
  email = '';
  password = '';
  acceptTerms = false;
  error = '';
  loading = false;

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  submit() {
    this.error = '';
    this.loading = true;
    this.auth.register(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigateByUrl('/login');
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo completar el registro. Inténtalo de nuevo.';
        this.cdr.markForCheck();
      },
    });
  }
}

export default RegistrarPage;
