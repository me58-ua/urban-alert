import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
  latitud: number | null;
  longitud: number | null;
  tone: 'danger' | 'warning' | 'success';
}

interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

interface MapTile {
  key: string;
  url: string;
  left: number;
  top: number;
}

interface MapCanvas {
  tiles: MapTile[];
  zoom: number;
  minX: number;
  minY: number;
  size: number;
}

interface MapFilter {
  label: string;
  estado: Estado | null;
}

interface MapViewModel {
  incidents: IncidentMapItem[];
  bounds: MapBounds;
  canvas: MapCanvas;
  loading: boolean;
  error: string | null;
}

// Cuántas incidencias pedimos al backend para el mapa (sin geofiltro).
const MAP_LIMIT = 100;
const DEFAULT_BOUNDS: MapBounds = {
  south: 40.4104,
  west: -3.7186,
  north: 40.4249,
  east: -3.6951,
};
const MIN_BOUNDS_SPAN = 0.01;
const TILE_SIZE = 256;
const TILE_GRID_SIZE = 5;

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
        map(({ items }): MapViewModel => {
          const incidents = items.map((incident) => this.toMapItem(incident));
          const bounds = this.boundsForIncidents(incidents);
          return {
            incidents,
            bounds,
            canvas: this.canvasForBounds(bounds),
            loading: false,
            error: null,
          };
        }),
        startWith<MapViewModel>({
          incidents: [],
          bounds: DEFAULT_BOUNDS,
          canvas: this.canvasForBounds(DEFAULT_BOUNDS),
          loading: true,
          error: null,
        }),
        catchError(() =>
          of<MapViewModel>({
            incidents: [],
            bounds: DEFAULT_BOUNDS,
            canvas: this.canvasForBounds(DEFAULT_BOUNDS),
            loading: false,
            error: 'No se pudieron cargar las incidencias.',
          }),
        ),
      ),
    ),
  );

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
  trackByTile = (_index: number, item: MapTile) => item.key;

  markerStyle(incident: IncidentMapItem, canvas: MapCanvas): Record<string, string> | null {
    if (incident.latitud === null || incident.longitud === null) return null;

    const point = this.project(incident.latitud, incident.longitud, canvas.zoom);

    return {
      left: `${((point.x - canvas.minX) / canvas.size) * 100}%`,
      top: `${((point.y - canvas.minY) / canvas.size) * 100}%`,
    };
  }

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
      latitud: hasCoords ? incident.latitud : null,
      longitud: hasCoords ? incident.longitud : null,
      tone: this.statusTone(incident.estado),
    };
  }

  private boundsForIncidents(incidents: IncidentMapItem[]): MapBounds {
    const located = incidents.filter(
      (incident) => incident.latitud !== null && incident.longitud !== null,
    );
    if (located.length === 0) return DEFAULT_BOUNDS;

    const latitudes = located.map((incident) => incident.latitud as number);
    const longitudes = located.map((incident) => incident.longitud as number);
    let south = Math.min(...latitudes);
    let north = Math.max(...latitudes);
    let west = Math.min(...longitudes);
    let east = Math.max(...longitudes);

    const latSpan = Math.max(north - south, MIN_BOUNDS_SPAN);
    const lngSpan = Math.max(east - west, MIN_BOUNDS_SPAN);
    const latPadding = latSpan * 0.25;
    const lngPadding = lngSpan * 0.25;

    south -= latPadding;
    north += latPadding;
    west -= lngPadding;
    east += lngPadding;

    return { south, west, north, east };
  }

  private canvasForBounds(bounds: MapBounds): MapCanvas {
    const zoom = this.zoomForBounds(bounds);
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLng = (bounds.east + bounds.west) / 2;
    const center = this.project(centerLat, centerLng, zoom);
    const centerTileX = Math.floor(center.x / TILE_SIZE);
    const centerTileY = Math.floor(center.y / TILE_SIZE);
    const halfGrid = Math.floor(TILE_GRID_SIZE / 2);
    const firstTileX = centerTileX - halfGrid;
    const firstTileY = centerTileY - halfGrid;
    const tiles: MapTile[] = [];
    const maxTile = 2 ** zoom;

    for (let row = 0; row < TILE_GRID_SIZE; row += 1) {
      for (let col = 0; col < TILE_GRID_SIZE; col += 1) {
        const tileX = firstTileX + col;
        const tileY = firstTileY + row;
        if (tileY < 0 || tileY >= maxTile) continue;

        const wrappedX = ((tileX % maxTile) + maxTile) % maxTile;
        tiles.push({
          key: `${zoom}-${tileX}-${tileY}`,
          url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`,
          left: (col / TILE_GRID_SIZE) * 100,
          top: (row / TILE_GRID_SIZE) * 100,
        });
      }
    }

    return {
      tiles,
      zoom,
      minX: firstTileX * TILE_SIZE,
      minY: firstTileY * TILE_SIZE,
      size: TILE_GRID_SIZE * TILE_SIZE,
    };
  }

  private zoomForBounds(bounds: MapBounds): number {
    const span = Math.max(bounds.north - bounds.south, bounds.east - bounds.west);
    if (span < 0.02) return 15;
    if (span < 0.05) return 14;
    if (span < 0.12) return 13;
    if (span < 0.25) return 12;
    if (span < 0.5) return 11;
    if (span < 1) return 10;
    if (span < 2) return 9;
    return 8;
  }

  private project(lat: number, lng: number, zoom: number): { x: number; y: number } {
    const sinLat = Math.sin((lat * Math.PI) / 180);
    const worldSize = TILE_SIZE * 2 ** zoom;

    return {
      x: ((lng + 180) / 360) * worldSize,
      y:
        (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) *
        worldSize,
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
