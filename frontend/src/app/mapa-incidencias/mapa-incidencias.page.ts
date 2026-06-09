import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AppMenuComponent } from '../shared/app-menu/app-menu.component';

interface IncidentMapItem {
  title: string;
  category: string;
  status: string;
  distance: string;
  address: string;
  tone: 'danger' | 'warning' | 'success';
}

@Component({
  selector: 'app-mapa-incidencias',
  templateUrl: 'mapa-incidencias.page.html',
  styleUrls: ['mapa-incidencias.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, AppMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapaIncidenciasPage {
  readonly brandMarkUrl =
    'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  readonly mapUrl: SafeResourceUrl;

  readonly incidents: IncidentMapItem[] = [
    {
      title: 'Farola fundida',
      category: 'Alumbrado',
      status: 'En revisión',
      distance: '240 m',
      address: 'Calle Mayor, 14',
      tone: 'warning',
    },
    {
      title: 'Bache en calzada',
      category: 'Vía pública',
      status: 'Pendiente',
      distance: '520 m',
      address: 'Plaza de España',
      tone: 'danger',
    },
    {
      title: 'Contenedor lleno',
      category: 'Basura',
      status: 'Asignada',
      distance: '760 m',
      address: 'Calle Bailén, 8',
      tone: 'success',
    },
  ];

  readonly filters = ['Todas', 'Pendientes', 'En revisión', 'Resueltas'];

  constructor(private readonly sanitizer: DomSanitizer) {
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.openstreetmap.org/export/embed.html?bbox=-3.7186%2C40.4104%2C-3.6951%2C40.4249&layer=mapnik&marker=40.4168%2C-3.7038'
    );
  }

  trackByTitle = (_index: number, item: { title: string }) => item.title;
  trackByLabel = (_index: number, item: string) => item;
}

export default MapaIncidenciasPage;
