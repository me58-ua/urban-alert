import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

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

  readonly items: AppMenuItem[] = [
    { label: 'Iniciar sesión / Registrarse', route: '/home', icon: 'person-circle-outline' },
    { label: 'Mapa', route: '/mapa-incidencias', icon: 'map-outline' },
    { label: 'Reportar', route: '/crear-incidencia', icon: 'add-circle-outline' },
    { label: 'Mis incidencias', route: '/detalle-incidencia', icon: 'document-text-outline' },
  ];

  toggle() {
    this.isOpen.update((isOpen) => !isOpen);
  }

  close() {
    this.isOpen.set(false);
  }

  trackByLabel = (_index: number, item: AppMenuItem) => item.label;
}
