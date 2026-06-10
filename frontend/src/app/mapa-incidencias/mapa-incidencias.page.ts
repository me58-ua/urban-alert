import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { catchError, map, of, startWith } from 'rxjs';
import {
  Categoria,
  Estado,
  Incidencia,
  IncidenciasService,
} from '../services/incidencias.service';
import { AppMenuComponent } from '../shared/app-menu/app-menu.component';

interface IncidentMapItem {
  id: number;
  title: string;
  category: string;
  status: string;
  distance: string;
  address: string;
  tone: 'danger' | 'warning' | 'success';
}

interface MapViewModel {
  incidents: IncidentMapItem[];
  loading: boolean;
  error: string | null;
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
  private readonly incidencias = inject(IncidenciasService);

  readonly brandMarkUrl =
    'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  // Centro de Madrid: mismo punto que el mapa embebido (marker 40.4168, -3.7038).
  private readonly centerLat = 40.4168;
  private readonly centerLng = -3.7038;

  readonly mapUrl: SafeResourceUrl;

  readonly filters = ['Todas', 'Pendientes', 'En revisión', 'Resueltas'];

  readonly vm$ = this.incidencias
    .listar({ lat: this.centerLat, lng: this.centerLng, radio: 5000 })
    .pipe(
      map(({ items }): MapViewModel => ({
        incidents: items.map((incident) => this.toMapItem(incident)),
        loading: false,
        error: null,
      })),
      startWith({ incidents: [], loading: true, error: null }),
      catchError(() =>
        of({
          incidents: [],
          loading: false,
          error: 'No se pudieron cargar las incidencias cercanas.',
        }),
      ),
    );

  constructor(private readonly sanitizer: DomSanitizer) {
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.openstreetmap.org/export/embed.html?bbox=-3.7186%2C40.4104%2C-3.6951%2C40.4249&layer=mapnik&marker=40.4168%2C-3.7038'
    );
  }

  trackById = (_index: number, item: IncidentMapItem) => item.id;
  trackByLabel = (_index: number, item: string) => item;

  private toMapItem(incident: Incidencia): IncidentMapItem {
    const hasCoords =
      Number.isFinite(incident.latitud) && Number.isFinite(incident.longitud);
    return {
      id: incident.id,
      title: incident.titulo,
      category: this.formatCategory(incident.categoria),
      status: this.formatStatus(incident.estado),
      distance: hasCoords
        ? this.formatDistance(
            this.haversine(
              this.centerLat,
              this.centerLng,
              incident.latitud,
              incident.longitud,
            ),
          )
        : '—',
      address: hasCoords
        ? `${incident.latitud.toFixed(5)}, ${incident.longitud.toFixed(5)}`
        : '—',
      tone: this.statusTone(incident.estado),
    };
  }

  private formatCategory(category: Categoria | string): string {
    return category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private formatStatus(status: Estado): string {
    const labels: Record<Estado, string> = {
      abierta: 'Abierta',
      en_progreso: 'En progreso',
      resuelta: 'Resuelta',
      rechazada: 'Rechazada',
    };
    return labels[status] ?? status;
  }

  private statusTone(status: Estado): 'danger' | 'warning' | 'success' {
    const tones: Record<Estado, 'danger' | 'warning' | 'success'> = {
      abierta: 'danger',
      en_progreso: 'warning',
      resuelta: 'success',
      rechazada: 'success',
    };
    return tones[status] ?? 'warning';
  }

  /** Distancia haversine en metros entre dos coordenadas. */
  private haversine(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371000; // metros
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  }
}

export default MapaIncidenciasPage;
