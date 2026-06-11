import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  Input,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NotificacionesService } from '../../services/notificaciones.service';

interface HeaderMenuItem {
  label: string;
  route: string;
  icon: string;
}

/**
 * Cabecera de marca reutilizable para las páginas ciudadanas.
 *
 * Renderiza su propio `<ion-header><ion-toolbar>` con:
 *  - La marca (logo + "Urban Alert" + un `subtitle` opcional) enlazada a /home.
 *  - Un botón hamburguesa animado (3 barras → X) que abre/cierra un menú
 *    off-canvas lateral desde la izquierda, con su backdrop.
 *  - El menú reutiliza la lógica de `app-menu` (estado de sesión, items con el
 *    badge de notificaciones no leídas, login/logout), refrescando la sesión y
 *    el contador de no leídas al abrir.
 *
 * Es `standalone` y `OnPush`; el estado vive en signals para que el cambio sea
 * detectable sin depender de la reactividad de `localStorage`.
 */
@Component({
  selector: 'app-header',
  templateUrl: 'header.component.html',
  styleUrls: ['header.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly router = inject(Router);

  /** Subtítulo de marca opcional, propio de cada página (p.ej. "Mis incidencias"). */
  @Input() subtitle?: string;

  /** URL del logo de marca (no usar la URL de Figma). */
  readonly brandMarkUrl = 'assets/media/images/logo-v3.png';

  /** `true` mientras el menú off-canvas está abierto. */
  readonly isOpen = signal(false);

  /**
   * Nº de notificaciones NO leídas. Se refresca al abrir el menú (no al cerrar),
   * igual que en `app-menu`. Se rellena vía HTTP (`listar({ leida: false })`).
   */
  readonly unreadCount = signal(0);

  /**
   * Contador que se incrementa en cada cambio de sesión para forzar el recálculo
   * de los signals derivados (el estado vive en `localStorage`, no reactivo).
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

  /** aria-label dinámico del botón hamburguesa. */
  readonly toggleLabel = computed(() =>
    this.isOpen() ? 'Cerrar menú' : 'Abrir menú',
  );

  /** Items siempre visibles, independientes del estado de sesión. */
  readonly items: HeaderMenuItem[] = [
    { label: 'Mapa', route: '/mapa-incidencias', icon: 'map-outline' },
    { label: 'Reportar', route: '/crear-incidencia', icon: 'add-circle-outline' },
    { label: 'Mis incidencias', route: '/mis-incidencias', icon: 'document-text-outline' },
    { label: 'Notificaciones', route: '/notificaciones', icon: 'notifications-outline' },
  ];

  /** Cierra el panel automáticamente al iniciar cualquier navegación. */
  private readonly navSub: Subscription;

  constructor() {
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
      .subscribe(() => {
        if (this.isOpen()) {
          this.close();
        }
      });
  }

  ngOnDestroy(): void {
    this.navSub.unsubscribe();
    // Por seguridad: si el componente se destruye con el panel abierto, no dejar
    // el scroll del body bloqueado.
    this.unlockBody();
  }

  /** Alterna el panel: al abrir refresca sesión y contador de no leídas. */
  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Abre el panel: relee la sesión y refresca el contador de no leídas. */
  open(): void {
    this.sessionVersion.update((v) => v + 1);
    this.refreshUnreadCount();
    this.isOpen.set(true);
    this.lockBody();
  }

  /** Cierra el panel y restaura el scroll del body. */
  close(): void {
    this.isOpen.set(false);
    this.unlockBody();
  }

  /** Cierra el menú con la tecla Escape cuando está abierto. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.close();
    }
  }

  /**
   * Recalcula el nº de notificaciones no leídas pidiendo
   * `GET /notificaciones?leida=false`. Si la petición falla, el contador se pone
   * a 0 para no mostrar un badge obsoleto.
   */
  refreshUnreadCount(): void {
    this.notificaciones.listar({ leida: false }).subscribe({
      next: (items) => this.unreadCount.set(items.length),
      error: () => this.unreadCount.set(0),
    });
  }

  /** Navega a una ruta cerrando antes el panel. */
  goTo(route: string, event: Event): void {
    event.preventDefault();
    this.close();
    setTimeout(() => void this.router.navigateByUrl(route), 0);
  }

  /** Cierra la sesión y redirige al login. */
  logout(event: Event): void {
    event.preventDefault();
    this.auth.logout();
    this.sessionVersion.update((v) => v + 1);
    this.close();
    setTimeout(() => void this.router.navigateByUrl('/login'), 0);
  }

  trackByLabel = (_index: number, item: HeaderMenuItem) => item.label;

  /** Bloquea el scroll del body mientras el off-canvas está abierto. */
  private lockBody(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.add('app-header-menu-open');
    }
  }

  /** Restaura el scroll del body. */
  private unlockBody(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('app-header-menu-open');
    }
  }
}
