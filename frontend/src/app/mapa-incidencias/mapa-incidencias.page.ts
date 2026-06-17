import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import { BehaviorSubject, catchError, map, of, startWith, switchMap, tap } from 'rxjs';
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

interface MapFilter {
  label: string;
  estado: Estado | null;
}

interface MapViewModel {
  incidents: IncidentMapItem[];
  loading: boolean;
  error: string | null;
}

const MAP_LIMIT = 100;
const DEFAULT_CENTER: L.LatLngExpression = [40.4168, -3.7038];

@Component({
  selector: 'app-mapa-incidencias',
  templateUrl: 'mapa-incidencias.page.html',
  styleUrls: ['mapa-incidencias.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, HeaderComponent, FooterComponent, UiButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapaIncidenciasPage implements AfterViewInit, OnDestroy {
  private readonly incidencias = inject(IncidenciasService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  @ViewChild('mapRoot') private readonly mapRoot?: ElementRef<HTMLElement>;

  private mapInstance?: L.Map;
  private markersLayer?: L.LayerGroup;
  private baseTileLayer?: L.TileLayer;
  private resizeObserver?: ResizeObserver;
  private usingFallbackTiles = false;
  private latestIncidents: IncidentMapItem[] = [];

  readonly filters: MapFilter[] = [
    { label: 'Todas', estado: null },
    { label: 'Pendientes', estado: 'abierta' },
    { label: 'En revisión', estado: 'en_progreso' },
    { label: 'Resueltas', estado: 'resuelta' },
  ];

  readonly selectedFilter = signal(0);

  private readonly selected$ = new BehaviorSubject(0);

  readonly vm$ = this.selected$.pipe(
    map((index) => this.buildQuery(index)),
    switchMap((filtros) =>
      this.incidencias.listar(filtros).pipe(
        map(({ items }): MapViewModel => {
          const incidents = items.map((incident) => this.toMapItem(incident));
          return {
            incidents,
            loading: false,
            error: null,
          };
        }),
        tap((vm) => this.renderIncidents(vm.incidents)),
        startWith<MapViewModel>({
          incidents: [],
          loading: true,
          error: null,
        }),
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

  ngAfterViewInit(): void {
    if (!this.mapRoot) return;
    const mapElement = this.mapRoot.nativeElement;

    this.zone.runOutsideAngular(() => {
      this.mapInstance = L.map(mapElement, {
        center: DEFAULT_CENTER,
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      this.baseTileLayer = this.createOsmTileLayer().addTo(this.mapInstance);

      this.markersLayer = L.layerGroup().addTo(this.mapInstance);
      this.renderIncidents(this.latestIncidents);

      this.resizeObserver = new ResizeObserver(() => this.refreshMapSize());
      this.resizeObserver.observe(mapElement);
      this.refreshMapSize();
    });
  }

  ionViewDidEnter(): void {
    this.refreshMapSize();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.mapInstance?.remove();
    this.mapInstance = undefined;
    this.markersLayer = undefined;
    this.baseTileLayer = undefined;
    this.resizeObserver = undefined;
  }

  selectFilter(index: number): void {
    if (index === this.selectedFilter()) return;
    this.selectedFilter.set(index);
    this.selected$.next(index);
  }

  trackById = (_index: number, item: IncidentMapItem) => item.id;
  trackByLabel = (_index: number, item: MapFilter) => item.label;

  private buildQuery(index: number): ListarFiltros {
    const estado = this.filters[index]?.estado ?? null;
    const filtros: ListarFiltros = { limit: MAP_LIMIT };
    if (estado) filtros.estado = estado;
    return filtros;
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

  private renderIncidents(incidents: IncidentMapItem[]): void {
    this.latestIncidents = incidents;
    if (!this.mapInstance || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    const located = incidents.filter(
      (incident) => incident.latitud !== null && incident.longitud !== null,
    );
    if (located.length === 0) {
      this.mapInstance.setView(DEFAULT_CENTER, 13);
      return;
    }

    for (const incident of located) {
      const marker = L.marker([incident.latitud as number, incident.longitud as number], {
        icon: this.markerIcon(incident.tone),
        keyboard: true,
        title: incident.title,
      });

      marker.bindTooltip(incident.title);
      marker.on('click', () => {
        this.zone.run(() => {
          void this.router.navigate(['/detalle-incidencia', incident.id]);
        });
      });
      marker.addTo(this.markersLayer);
    }

    const bounds = L.latLngBounds(
      located.map((incident) => [incident.latitud as number, incident.longitud as number]),
    );
    this.mapInstance.fitBounds(bounds, { maxZoom: 16, padding: [28, 28] });
    this.refreshMapSize();
  }

  private markerIcon(tone: IncidentMapItem['tone']): L.DivIcon {
    return L.divIcon({
      className: `incident-map-marker incident-map-marker--${tone}`,
      html: '<span class="incident-map-marker__pin"></span>',
      iconAnchor: [14, 28],
      iconSize: [28, 28],
    });
  }

  private createOsmTileLayer(): L.TileLayer {
    const layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });

    layer.on('tileerror', () => this.useFallbackTiles());
    return layer;
  }

  private useFallbackTiles(): void {
    if (this.usingFallbackTiles || !this.mapInstance) return;
    this.usingFallbackTiles = true;

    if (this.baseTileLayer) {
      this.mapInstance.removeLayer(this.baseTileLayer);
    }

    this.baseTileLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 20,
        subdomains: 'abcd',
      },
    ).addTo(this.mapInstance);
  }

  private refreshMapSize(): void {
    this.zone.runOutsideAngular(() => {
      for (const delay of [0, 120, 360]) {
        setTimeout(() => this.mapInstance?.invalidateSize(), delay);
      }
    });
  }

  private formatCategory(category: Categoria | string): string {
    return category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

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
