import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';

interface AdminMenuItem {
  label: string;
  route: string;
  icon: string;
}

/**
 * Menú de navegación compartido del panel de administración: botón ☰ +
 * `ion-popover` con los enlaces de las secciones admin y un botón de
 * "Cerrar sesión". Se usa en la toolbar de las páginas admin
 * (dashboard, incidencias, equipos y usuarios) para evitar duplicar el markup.
 */
@Component({
  selector: 'app-admin-menu',
  templateUrl: 'admin-menu.component.html',
  styleUrls: ['admin-menu.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMenuComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isMenuOpen = signal(false);
  readonly popoverEvent = signal<Event | undefined>(undefined);

  readonly menuItems: AdminMenuItem[] = [
    { label: 'Dashboard', route: '/admin', icon: 'grid-outline' },
    { label: 'Incidencias', route: '/admin/incidencias', icon: 'document-text-outline' },
    { label: 'Equipos', route: '/admin/equipos', icon: 'people-circle-outline' },
    { label: 'Usuarios', route: '/admin/usuarios', icon: 'person-circle-outline' },
    { label: 'Mapa ciudadano', route: '/mapa-incidencias', icon: 'map-outline' },
    { label: 'Vista ciudadana', route: '/home', icon: 'people-outline' },
  ];

  openMenu(event: Event) {
    this.popoverEvent.set(event);
    this.isMenuOpen.set(true);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
    this.popoverEvent.set(undefined);
  }

  /** Cierra la sesión y redirige al login. */
  logout() {
    this.closeMenu();
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  trackByMenuLabel = (_index: number, item: AdminMenuItem) => item.label;
}

export default AdminMenuComponent;
