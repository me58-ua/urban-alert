import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { catchError, forkJoin, map, of, startWith } from 'rxjs';
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

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: 'admin-dashboard.page.html',
  styleUrls: ['admin-dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, AdminMenuComponent, StatCardComponent, UiButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage {
  private readonly incidencias = inject(IncidenciasService);
  private readonly stats = inject(StatsService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly brandMarkUrl =
    'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  readonly mapUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'https://www.openstreetmap.org/export/embed.html?bbox=-3.7186%2C40.4104%2C-3.6951%2C40.4249&layer=mapnik&marker=40.4168%2C-3.7038',
  );

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
