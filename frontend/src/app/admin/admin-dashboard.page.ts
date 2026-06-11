import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { catchError, forkJoin, map, of, startWith } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Estado, Incidencia, IncidenciasService } from '../services/incidencias.service';
import { Estadisticas, StatsService } from '../services/stats.service';

interface AdminMetric {
  label: string;
  value: number;
  icon: string;
  tone: 'blue' | 'amber' | 'green' | 'red';
}

export interface AdminViewModel {
  incidents: Incidencia[];
  metrics: AdminMetric[];
  loading: boolean;
  error: string | null;
}

interface AdminMenuItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: 'admin-dashboard.page.html',
  styleUrls: ['admin-dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage {
  private readonly incidencias = inject(IncidenciasService);
  private readonly stats = inject(StatsService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isMenuOpen = signal(false);
  readonly popoverEvent = signal<Event | undefined>(undefined);

  readonly brandMarkUrl =
    'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  readonly mapUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'https://www.openstreetmap.org/export/embed.html?bbox=-3.7186%2C40.4104%2C-3.6951%2C40.4249&layer=mapnik&marker=40.4168%2C-3.7038',
  );

  readonly statusOrder: Estado[] = ['abierta', 'en_progreso', 'resuelta', 'rechazada'];

  readonly menuItems: AdminMenuItem[] = [
    { label: 'Dashboard', route: '/admin', icon: 'grid-outline' },
    { label: 'Equipos', route: '/admin/equipos', icon: 'people-circle-outline' },
    { label: 'Usuarios', route: '/admin/usuarios', icon: 'person-circle-outline' },
    { label: 'Mapa ciudadano', route: '/mapa-incidencias', icon: 'map-outline' },
    { label: 'Vista ciudadana', route: '/home', icon: 'people-outline' },
  ];

  readonly vm$ = forkJoin({
    stats: this.stats.obtener(),
    page: this.incidencias.listar(),
  }).pipe(
    map(({ stats, page }): AdminViewModel => ({
      incidents: page.items,
      metrics: this.buildMetrics(stats),
      loading: false,
      error: null,
    })),
    startWith({
      incidents: [],
      metrics: this.buildMetrics(null),
      loading: true,
      error: null,
    }),
    catchError(() =>
      of({
        incidents: [],
        metrics: this.buildMetrics(null),
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

  openMenu(event: Event) {
    this.popoverEvent.set(event);
    this.isMenuOpen.set(true);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
    this.popoverEvent.set(undefined);
  }

  /** Cierra la sesión y redirige al login. */
  logout() {
    this.closeMenu();
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  trackById = (_index: number, item: Incidencia) => item.id;
  trackByLabel = (_index: number, item: { label: string }) => item.label;
  trackByStatus = (_index: number, item: Estado) => item;
  trackByMenuLabel = (_index: number, item: AdminMenuItem) => item.label;

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
