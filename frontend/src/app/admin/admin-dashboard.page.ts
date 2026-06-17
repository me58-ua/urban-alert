import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import * as L from 'leaflet';
import { catchError, forkJoin, map, of, startWith, tap } from 'rxjs';
import { AdminMenuComponent } from '../shared/admin-menu/admin-menu.component';
import { StatCardComponent } from '../shared/stat-card/stat-card.component';
import { UiButtonComponent } from '../shared/ui-button/ui-button.component';
import { Estado, Incidencia, IncidenciasService } from '../services/incidencias.service';
import { Estadisticas, StatsService } from '../services/stats.service';

interface AdminMetric {
  label: string;
  value: number;
  icon: string;
  tone: 'blue' | 'amber' | 'green' | 'red';
}

/** Una barra del gráfico de actividad real (reportes por día). */
export interface ActivityBar {
  /** Etiqueta corta del día (L, M, X, J, V, S, D). */
  label: string;
  /** Número de incidencias creadas ese día. */
  count: number;
  /** Altura relativa de la barra respecto al día más activo (0–100). */
  size: number;
}

/** Fila de un desglose (categoría o prioridad) con barra proporcional. */
export interface BreakdownRow {
  key: string;
  label: string;
  count: number;
  /** Porcentaje respecto al valor máximo del desglose (0–100). */
  size: number;
}

export interface AdminViewModel {
  incidents: Incidencia[];
  metrics: AdminMetric[];
  /** Estadísticas agregadas de `/stats` (null mientras carga o si falla). */
  stats: Estadisticas | null;
  loading: boolean;
  error: string | null;
}

const ADMIN_MAP_CENTER: L.LatLngExpression = [40.4168, -3.7038];

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: 'admin-dashboard.page.html',
  styleUrls: ['admin-dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, AdminMenuComponent, StatCardComponent, UiButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage implements OnDestroy {
  private readonly incidencias = inject(IncidenciasService);
  private readonly stats = inject(StatsService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  private mapInstance?: L.Map;
  private markersLayer?: L.LayerGroup;
  private baseTileLayer?: L.TileLayer;
  private resizeObserver?: ResizeObserver;
  private latestIncidents: Incidencia[] = [];
  private usingFallbackTiles = false;

  @ViewChild('adminMapRoot')
  set adminMapRoot(ref: ElementRef<HTMLElement> | undefined) {
    if (ref) {
      this.initMap(ref.nativeElement);
    }
  }

  readonly brandMarkUrl = 'assets/media/images/logo-v3.png';

  readonly statusOrder: Estado[] = ['abierta', 'en_progreso', 'resuelta', 'rechazada'];

  readonly vm$ = forkJoin({
    stats: this.stats.obtener(),
    page: this.incidencias.listar(),
  }).pipe(
    map(({ stats, page }): AdminViewModel => ({
      incidents: page.items,
      metrics: this.buildMetrics(stats),
      stats,
      loading: false,
      error: null,
    })),
    tap((vm) => {
      if (!vm.loading) {
        this.renderMapIncidents(vm.incidents);
      }
    }),
    startWith({
      incidents: [],
      metrics: this.buildMetrics(null),
      stats: null,
      loading: true,
      error: null,
    }),
    catchError(() =>
      of({
        incidents: [],
        metrics: this.buildMetrics(null),
        stats: null,
        loading: false,
        error: 'No se pudieron cargar las métricas del panel.',
      }),
    ),
  );

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.mapInstance?.remove();
    this.mapInstance = undefined;
    this.markersLayer = undefined;
    this.baseTileLayer = undefined;
    this.resizeObserver = undefined;
  }

  countByStatus(incidents: Incidencia[], status: Estado): number {
    return incidents.filter((incident) => incident.estado === status).length;
  }

  recentIncidents(incidents: Incidencia[]): Incidencia[] {
    return [...incidents]
      .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
      .slice(0, 6);
  }

  formatStatus(status: Estado): string {
    const labels: Record<Estado, string> = {
      abierta: 'Abierta',
      en_progreso: 'En progreso',
      resuelta: 'Resuelta',
      rechazada: 'Rechazada',
    };
    return labels[status] ?? status;
  }

  formatCategory(category: string): string {
    return category.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  formatPriority(priority: string): string {
    const labels: Record<string, string> = {
      baja: 'Baja',
      media: 'Media',
      alta: 'Alta',
    };
    return labels[priority] ?? priority;
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  statusTone(status: Estado): string {
    const tones: Record<Estado, string> = {
      abierta: 'red',
      en_progreso: 'amber',
      resuelta: 'green',
      rechazada: 'slate',
    };
    return tones[status] ?? 'slate';
  }

  openIncidents(incidents: Incidencia[]): number {
    return incidents.filter((incident) => incident.estado !== 'resuelta').length;
  }

  completionPercent(incidents: Incidencia[]): number {
    if (incidents.length === 0) return 0;
    return Math.round((this.countByStatus(incidents, 'resuelta') / incidents.length) * 100);
  }

  /** Hay datos reales para pintar el donut (evita un anillo al 0% que parece roto). */
  hasIncidents(incidents: Incidencia[]): boolean {
    return incidents.length > 0;
  }

  /**
   * Construye el gráfico de actividad REAL agrupando las incidencias por día de
   * `fecha_creacion` durante los últimos 7 días (de más antiguo a hoy). La altura
   * de cada barra es proporcional al día con más reportes. Sin valores fijos.
   */
  activityByDay(incidents: Incidencia[]): ActivityBar[] {
    const dayLabels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets: ActivityBar[] = [];
    const counts: Record<string, number> = {};

    for (const incident of incidents) {
      const created = new Date(incident.fecha_creacion);
      if (Number.isNaN(created.getTime())) continue;
      created.setHours(0, 0, 0, 0);
      const key = created.getTime().toString();
      counts[key] = (counts[key] ?? 0) + 1;
    }

    for (let offset = 6; offset >= 0; offset--) {
      const day = new Date(today);
      day.setDate(today.getDate() - offset);
      const key = day.getTime().toString();
      buckets.push({
        label: dayLabels[day.getDay()],
        count: counts[key] ?? 0,
        size: 0,
      });
    }

    const max = buckets.reduce((peak, bar) => Math.max(peak, bar.count), 0);
    if (max > 0) {
      for (const bar of buckets) {
        bar.size = Math.round((bar.count / max) * 100);
      }
    }
    return buckets;
  }

  /** Total de reportes de los últimos 7 días según el gráfico de actividad. */
  activityTotal(bars: ActivityBar[]): number {
    return bars.reduce((sum, bar) => sum + bar.count, 0);
  }

  /** Desglose ordenado de `por_categoria` con barras proporcionales. */
  categoryBreakdown(stats: Estadisticas | null): BreakdownRow[] {
    return this.toBreakdown(stats?.por_categoria, (key) => this.formatCategory(key));
  }

  /** Desglose ordenado de `por_prioridad` con barras proporcionales. */
  priorityBreakdown(stats: Estadisticas | null): BreakdownRow[] {
    return this.toBreakdown(stats?.por_prioridad, (key) => this.formatPriority(key));
  }

  /** Formatea el tiempo medio de resolución; muestra "—" si el backend devuelve null. */
  formatResolutionTime(hours: number | null | undefined): string {
    if (hours == null) return '—';
    return `${Math.round(hours * 10) / 10} h`;
  }

  /** Formatea un porcentaje (0–100) con un decimal como máximo. */
  formatPercent(value: number | null | undefined): string {
    if (value == null) return '—';
    return `${Math.round(value * 10) / 10}%`;
  }

  private toBreakdown(
    source: Record<string, number> | undefined,
    label: (key: string) => string,
  ): BreakdownRow[] {
    if (!source) return [];
    const entries = Object.entries(source);
    const max = entries.reduce((peak, [, value]) => Math.max(peak, value), 0);
    return entries
      .map(([key, count]) => ({
        key,
        label: label(key),
        count,
        size: max > 0 ? Math.round((count / max) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  trackById = (_index: number, item: Incidencia) => item.id;
  trackByLabel = (_index: number, item: { label: string }) => item.label;
  trackByStatus = (_index: number, item: Estado) => item;
  trackByBarIndex = (index: number) => index;
  trackByKey = (_index: number, item: BreakdownRow) => item.key;

  private initMap(mapElement: HTMLElement): void {
    if (this.mapInstance) {
      this.refreshMapSize();
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.mapInstance = L.map(mapElement, {
        center: ADMIN_MAP_CENTER,
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      this.baseTileLayer = this.createOsmTileLayer().addTo(this.mapInstance);
      this.markersLayer = L.layerGroup().addTo(this.mapInstance);
      this.renderMapIncidents(this.latestIncidents);

      this.resizeObserver = new ResizeObserver(() => this.refreshMapSize());
      this.resizeObserver.observe(mapElement);
      this.refreshMapSize();
    });
  }

  private renderMapIncidents(incidents: Incidencia[]): void {
    this.latestIncidents = incidents;
    if (!this.mapInstance || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    const located = incidents.filter(
      (incident) => Number.isFinite(incident.latitud) && Number.isFinite(incident.longitud),
    );

    if (located.length === 0) {
      this.mapInstance.setView(ADMIN_MAP_CENTER, 12);
      return;
    }

    for (const incident of located) {
      const marker = L.marker([incident.latitud, incident.longitud], {
        icon: this.markerIcon(this.markerTone(incident.estado)),
        keyboard: true,
        title: incident.titulo,
      });

      marker.bindTooltip(incident.titulo);
      marker.on('click', () => {
        this.zone.run(() => {
          void this.router.navigate(['/detalle-incidencia', incident.id]);
        });
      });
      marker.addTo(this.markersLayer);
    }

    const bounds = L.latLngBounds(
      located.map((incident) => [incident.latitud, incident.longitud]),
    );
    this.mapInstance.fitBounds(bounds, { maxZoom: 16, padding: [24, 24] });
    this.refreshMapSize();
  }

  private markerTone(status: Estado): 'danger' | 'warning' | 'success' {
    if (status === 'abierta') return 'danger';
    if (status === 'en_progreso') return 'warning';
    return 'success';
  }

  private markerIcon(tone: 'danger' | 'warning' | 'success'): L.DivIcon {
    return L.divIcon({
      className: `admin-map-marker admin-map-marker--${tone}`,
      html: '<span class="admin-map-marker__pin"></span>',
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

  private buildMetrics(stats: Estadisticas | null): AdminMetric[] {
    const porEstado = stats?.por_estado;
    return [
      { label: 'Incidencias totales', value: stats?.total ?? 0, icon: 'albums-outline', tone: 'blue' },
      { label: 'Abiertas', value: porEstado?.abierta ?? 0, icon: 'alert-circle-outline', tone: 'red' },
      { label: 'En progreso', value: porEstado?.en_progreso ?? 0, icon: 'construct-outline', tone: 'amber' },
      { label: 'Resueltas', value: porEstado?.resuelta ?? 0, icon: 'checkmark-circle-outline', tone: 'green' },
    ];
  }
}

export default AdminDashboardPage;
