import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface AppMenuItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-menu',
  templateUrl: 'app-menu.component.html',
  styleUrls: ['app-menu.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppMenuComponent {
  private readonly auth = inject(AuthService);

  readonly isOpen = signal(false);
  readonly popoverEvent = signal<Event | undefined>(undefined);

  /**
   * Contador que se incrementa en cada cambio de sesión para forzar el
   * recálculo de los signals derivados (el estado vive en `localStorage`,
   * que no es reactivo por sí mismo).
   */
  private readonly sessionVersion = signal(0);

  /** `true` si hay una sesión activa (token persistido). */
  readonly isAuthenticated = computed(() => {
    this.sessionVersion();
    return this.auth.isAuthenticated();
  });

  /** Email del usuario autenticado, o `null`. */
  readonly email = computed(() => {
    this.sessionVersion();
    return this.auth.email();
  });

  /** Etiqueta legible del rol del usuario autenticado, o `null`. */
  readonly roleLabel = computed(() => {
    this.sessionVersion();
    const rol = this.auth.role();
    if (rol === 'admin') return 'Administrador';
    if (rol === 'ciudadano') return 'Ciudadano';
    return null;
  });

  /** Items siempre visibles, independientes del estado de sesión. */
  readonly items: AppMenuItem[] = [
    { label: 'Mapa', route: '/mapa-incidencias', icon: 'map-outline' },
    { label: 'Reportar', route: '/crear-incidencia', icon: 'add-circle-outline' },
    { label: 'Mis incidencias', route: '/mis-incidencias', icon: 'document-text-outline' },
    { label: 'Notificaciones', route: '/notificaciones', icon: 'notifications-outline' },
  ];

  constructor(private readonly router: Router) {}

  toggle(event: Event) {
    // Releer el estado de sesión cada vez que se abre el menú.
    this.sessionVersion.update((v) => v + 1);
    this.popoverEvent.set(event);
    this.isOpen.update((isOpen) => !isOpen);
  }

  goTo(route: string, event: Event) {
    event.preventDefault();
    this.close();
    setTimeout(() => void this.router.navigateByUrl(route), 0);
  }

  /** Cierra la sesión y redirige al login. */
  logout(event: Event) {
    event.preventDefault();
    this.auth.logout();
    this.sessionVersion.update((v) => v + 1);
    this.close();
    setTimeout(() => void this.router.navigateByUrl('/login'), 0);
  }

  close() {
    this.isOpen.set(false);
    this.popoverEvent.set(undefined);
  }

  trackByLabel = (_index: number, item: AppMenuItem) => item.label;
}
