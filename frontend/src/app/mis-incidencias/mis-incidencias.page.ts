import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { AppMenuComponent } from '../shared/app-menu/app-menu.component';
import { AuthService } from '../services/auth.service';
import { Estado, Incidencia, IncidenciasService, Prioridad } from '../services/incidencias.service';

@Component({
  selector: 'app-mis-incidencias',
  templateUrl: 'mis-incidencias.page.html',
  styleUrls: ['mis-incidencias.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, AppMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisIncidenciasPage implements OnInit {
  private readonly incidencias = inject(IncidenciasService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly brandMarkUrl =
    'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  readonly incidents = signal<Incidencia[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // ── Paginación (#62) ───────────────────────────────────────────────────────
  readonly limit = 20;
  readonly offset = signal(0);
  readonly total = signal(0);

  /** Texto "X-Y de total" para el pie de paginación (1-based, vacío si no hay datos). */
  readonly rangeLabel = computed(() => {
    const total = this.total();
    if (total === 0) return '0 de 0';
    const start = this.offset() + 1;
    const end = Math.min(this.offset() + this.limit, total);
    return `${start}-${end} de ${total}`;
  });

  readonly canPrev = computed(() => this.offset() > 0);
  readonly canNext = computed(() => this.offset() + this.limit < this.total());

  ngOnInit(): void {
    // Sin sesión: no dispara la petición y redirige al login (la issue pide
    // gestionar proactivamente la ausencia de sesión, además del 401 del interceptor).
    if (!this.auth.isAuthenticated()) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.loadIncidents();
  }

  loadIncidents(): void {
    this.loading.set(true);
    this.error.set(null);
    this.incidencias.misIncidencias({ limit: this.limit, offset: this.offset() }).subscribe({
      next: (page) => {
        this.incidents.set(page.items);
        this.total.set(page.total);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.incidents.set([]);
        this.error.set(
          'No se pudieron cargar tus incidencias. Intentalo de nuevo en unos minutos.',
        );
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  /** Página anterior: retrocede un bloque de `limit` y recarga. */
  prevPage(): void {
    if (!this.canPrev()) return;
    this.offset.set(Math.max(0, this.offset() - this.limit));
    this.loadIncidents();
  }

  /** Página siguiente: avanza un bloque de `limit` y recarga. */
  nextPage(): void {
    if (!this.canNext()) return;
    this.offset.set(this.offset() + this.limit);
    this.loadIncidents();
  }

  imageUrl(incident: Incidencia): string | null {
    const ruta = incident.imagenes?.[0]?.ruta;
    if (!ruta) return null;
    if (/^https?:\/\//i.test(ruta) || ruta.startsWith('data:')) return ruta;
    const normalizedPath = ruta.startsWith('/') ? ruta : `/${ruta}`;
    return `${environment.apiUrl}${normalizedPath}`;
  }

  formatCategory(category: string): string {
    return category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

  formatPriority(priority: Prioridad): string {
    const labels: Record<Prioridad, string> = {
      baja: 'Baja',
      media: 'Media',
      alta: 'Alta',
    };
    return labels[priority] ?? priority;
  }

  statusTone(status: Estado): 'danger' | 'warning' | 'success' | 'neutral' {
    const tones: Record<Estado, 'danger' | 'warning' | 'success' | 'neutral'> = {
      abierta: 'danger',
      en_progreso: 'warning',
      resuelta: 'success',
      rechazada: 'neutral',
    };
    return tones[status] ?? 'neutral';
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  trackById = (_index: number, item: Incidencia) => item.id;
}

export default MisIncidenciasPage;
