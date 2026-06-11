import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { BehaviorSubject, catchError, map, of, startWith, switchMap } from 'rxjs';
import {
  Categoria,
  Estado,
  Incidencia,
  IncidenciasService,
  ListarFiltros,
} from '../services/incidencias.service';
import { HeaderComponent } from '../shared/header/header.component';
import { FooterComponent } from '../shared/footer/footer.component';
import { UiButtonComponent } from '../shared/ui-button/ui-button.component';

interface IncidentMapItem {
  id: number;
  title: string;
  category: string;
  categoryKey: string;
  categoryIcon: string;
  status: string;
  address: string;
  tone: 'danger' | 'warning' | 'success';
}

interface MapFilter {
  label: string;
  estado: Estado | null;
}

interface MapViewModel {
  incidents: IncidentMapItem[];
  loading: boolean;
  error: string | null;
}

// Cuántas incidencias pedimos al backend para el mapa (sin geofiltro).
const MAP_LIMIT = 100;

@Component({
  selector: 'app-mapa-incidencias',
  templateUrl: 'mapa-incidencias.page.html',
  styleUrls: ['mapa-incidencias.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, HeaderComponent, FooterComponent, UiButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapaIncidenciasPage {
  private readonly incidencias = inject(IncidenciasService);

  readonly mapUrl: SafeResourceUrl;

  // Chips de filtro: cada uno mapea a un `estado` del backend (o null = Todas).
  readonly filters: MapFilter[] = [
    { label: 'Todas', estado: null },
    { label: 'Pendientes', estado: 'abierta' },
    { label: 'En revisión', estado: 'en_progreso' },
    { label: 'Resueltas', estado: 'resuelta' },
  ];

  // Índice del chip activo; al cambiar se reconstruye la consulta y recarga.
  readonly selectedFilter = signal(0);

  // Emite el índice del chip seleccionado; dispara la recarga de la lista.
  private readonly selected$ = new BehaviorSubject(0);

  // Sin geofiltro fijo: toda incidencia creada se ve, sea cual sea su ubicación.
  readonly vm$ = this.selected$.pipe(
    map((index) => this.buildQuery(index)),
    switchMap((filtros) =>
      this.incidencias.listar(filtros).pipe(
        map(({ items }): MapViewModel => ({
          incidents: items.map((incident) => this.toMapItem(incident)),
          loading: false,
          error: null,
        })),
        startWith<MapViewModel>({ incidents: [], loading: true, error: null }),
        catchError(() =>
          of<MapViewModel>({
            incidents: [],
            loading: false,
            error: 'No se pudieron cargar las incidencias.',
          }),
        ),
      ),
    ),
  );

  constructor(private readonly sanitizer: DomSanitizer) {
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.openstreetmap.org/export/embed.html?bbox=-3.7186%2C40.4104%2C-3.6951%2C40.4249&layer=mapnik&marker=40.4168%2C-3.7038'
    );
  }

  selectFilter(index: number): void {
    if (index === this.selectedFilter()) return;
    this.selectedFilter.set(index);
    this.selected$.next(index);
  }

  /** Construye los filtros de `listar()` a partir del chip seleccionado. */
  private buildQuery(index: number): ListarFiltros {
    const estado = this.filters[index]?.estado ?? null;
    const filtros: ListarFiltros = { limit: MAP_LIMIT };
    if (estado) filtros.estado = estado;
    return filtros;
  }

  trackById = (_index: number, item: IncidentMapItem) => item.id;
  trackByLabel = (_index: number, item: MapFilter) => item.label;

  private toMapItem(incident: Incidencia): IncidentMapItem {
    const hasCoords =
      Number.isFinite(incident.latitud) && Number.isFinite(incident.longitud);
    const categoryKey = String(incident.categoria);
    return {
      id: incident.id,
      title: incident.titulo,
      category: this.formatCategory(incident.categoria),
      categoryKey,
      categoryIcon: this.categoryIcon(categoryKey),
      status: this.formatStatus(incident.estado),
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

  /** Icono representativo por categoría (cae a uno genérico si no se conoce). */
  private categoryIcon(category: string): string {
    const icons: Record<string, string> = {
      infraestructura: 'construct-outline',
      alumbrado: 'bulb-outline',
      residuos: 'trash-outline',
      trafico: 'car-outline',
      zonas_verdes: 'leaf-outline',
      otro: 'ellipsis-horizontal-circle-outline',
    };
    return icons[category] ?? 'pricetag-outline';
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
}

export default MapaIncidenciasPage;
