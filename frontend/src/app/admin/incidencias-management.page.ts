import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../services/auth.service';
import {
  Categoria,
  Estado,
  Incidencia,
  IncidenciasService,
  ListarFiltros,
  Prioridad,
} from '../services/incidencias.service';

interface AdminMenuItem {
  label: string;
  route: string;
  icon: string;
}

interface FiltroOption<T> {
  value: T | '';
  label: string;
}

/**
 * Panel admin de gestión de incidencias: lista filtrable por
 * estado / categoría / prioridad. Cada fila enlaza al detalle, donde el admin
 * puede cambiar estado y prioridad (#58).
 */
@Component({
  selector: 'app-incidencias-management',
  templateUrl: 'incidencias-management.page.html',
  styleUrls: ['incidencias-management.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidenciasManagementPage implements OnInit {
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly brandMarkUrl =
    'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  readonly isMenuOpen = signal(false);
  readonly popoverEvent = signal<Event | undefined>(undefined);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly incidencias = signal<Incidencia[]>([]);

  readonly menuItems: AdminMenuItem[] = [
    { label: 'Dashboard', route: '/admin', icon: 'grid-outline' },
    { label: 'Incidencias', route: '/admin/incidencias', icon: 'document-text-outline' },
    { label: 'Equipos', route: '/admin/equipos', icon: 'people-circle-outline' },
    { label: 'Usuarios', route: '/admin/usuarios', icon: 'person-circle-outline' },
    { label: 'Mapa ciudadano', route: '/mapa-incidencias', icon: 'map-outline' },
    { label: 'Vista ciudadana', route: '/home', icon: 'people-outline' },
  ];

  // ── Filtros (selects). '' = sin filtro. ──────────────────────────────────
  filtroEstado: Estado | '' = '';
  filtroCategoria: Categoria | '' = '';
  filtroPrioridad: Prioridad | '' = '';

  readonly estadoOptions: FiltroOption<Estado>[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'abierta', label: 'Abierta' },
    { value: 'en_progreso', label: 'En progreso' },
    { value: 'resuelta', label: 'Resuelta' },
    { value: 'rechazada', label: 'Rechazada' },
  ];

  readonly categoriaOptions: FiltroOption<Categoria>[] = [
    { value: '', label: 'Todas las categorias' },
    { value: 'infraestructura', label: 'Infraestructura' },
    { value: 'alumbrado', label: 'Alumbrado' },
    { value: 'residuos', label: 'Residuos' },
    { value: 'trafico', label: 'Trafico' },
    { value: 'zonas_verdes', label: 'Zonas verdes' },
    { value: 'otro', label: 'Otro' },
  ];

  readonly prioridadOptions: FiltroOption<Prioridad>[] = [
    { value: '', label: 'Todas las prioridades' },
    { value: 'baja', label: 'Baja' },
    { value: 'media', label: 'Media' },
    { value: 'alta', label: 'Alta' },
  ];

  ngOnInit(): void {
    this.loadIncidents();
  }

  /** Construye los filtros activos y pide la lista al backend. */
  loadIncidents(): void {
    this.loading.set(true);
    this.error.set(null);

    const filtros: ListarFiltros = {};
    if (this.filtroEstado) filtros.estado = this.filtroEstado;
    if (this.filtroCategoria) filtros.categoria = this.filtroCategoria;
    if (this.filtroPrioridad) filtros.prioridad = this.filtroPrioridad;

    this.incidenciasService.listar(filtros).subscribe({
      next: (page) => {
        this.incidencias.set(page.items);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          this.messageFromError(err, 'No se pudieron cargar las incidencias.'),
        );
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  /** Re-aplica los filtros (llamado al cambiar cualquier select). */
  applyFilters(): void {
    this.loadIncidents();
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

  // ── Helpers de presentación ───────────────────────────────────────────────
  estadoLabel(estado: Estado): string {
    const labels: Record<Estado, string> = {
      abierta: 'Abierta',
      en_progreso: 'En progreso',
      resuelta: 'Resuelta',
      rechazada: 'Rechazada',
    };
    return labels[estado] ?? estado;
  }

  estadoTone(estado: Estado): string {
    const tones: Record<Estado, string> = {
      abierta: 'red',
      en_progreso: 'amber',
      resuelta: 'green',
      rechazada: 'slate',
    };
    return tones[estado] ?? 'slate';
  }

  categoriaLabel(categoria: Categoria): string {
    const labels: Record<Categoria, string> = {
      infraestructura: 'Infraestructura',
      alumbrado: 'Alumbrado',
      residuos: 'Residuos',
      trafico: 'Trafico',
      zonas_verdes: 'Zonas verdes',
      otro: 'Otro',
    };
    return labels[categoria] ?? categoria;
  }

  prioridadLabel(prioridad: Prioridad): string {
    const labels: Record<Prioridad, string> = {
      baja: 'Baja',
      media: 'Media',
      alta: 'Alta',
    };
    return labels[prioridad] ?? prioridad;
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  /**
   * Extrae un mensaje legible del error del backend.
   * FastAPI suele devolver `{ detail: '…' }` (string) en los 4xx.
   */
  private messageFromError(err: HttpErrorResponse, fallback: string): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length && detail[0]?.msg) {
      return String(detail[0].msg);
    }
    if (typeof err?.error === 'string' && err.error.trim()) return err.error;
    return fallback;
  }

  trackByIncidentId = (_index: number, item: Incidencia) => item.id;
  trackByMenuLabel = (_index: number, item: AdminMenuItem) => item.label;
}

export default IncidenciasManagementPage;
