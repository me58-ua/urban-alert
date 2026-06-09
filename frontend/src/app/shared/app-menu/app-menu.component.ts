import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';

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
  readonly isOpen = signal(false);
  readonly popoverEvent = signal<Event | undefined>(undefined);

  readonly items: AppMenuItem[] = [
    { label: 'Iniciar sesión / Registrarse', route: '/home', icon: 'person-circle-outline' },
    { label: 'Mapa', route: '/mapa-incidencias', icon: 'map-outline' },
    { label: 'Reportar', route: '/crear-incidencia', icon: 'add-circle-outline' },
    { label: 'Mis incidencias', route: '/detalle-incidencia', icon: 'document-text-outline' },
  ];

  constructor(private readonly router: Router) {}

  toggle(event: Event) {
    this.popoverEvent.set(event);
    this.isOpen.update((isOpen) => !isOpen);
  }

  goTo(route: string, event: Event) {
    event.preventDefault();
    this.close();
    setTimeout(() => void this.router.navigateByUrl(route), 0);
  }

  close() {
    this.isOpen.set(false);
    this.popoverEvent.set(undefined);
  }

  trackByLabel = (_index: number, item: AppMenuItem) => item.label;
}
