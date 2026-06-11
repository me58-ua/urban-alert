import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { HeaderComponent } from '../shared/header/header.component';
import { FooterComponent } from '../shared/footer/footer.component';
import { UiButtonComponent } from '../shared/ui-button/ui-button.component';
import { AuthService } from '../services/auth.service';
import { Estado, Historial, Incidencia, IncidenciasService, Prioridad } from '../services/incidencias.service';
import { Notificacion, NotificacionesService } from '../services/notificaciones.service';

interface AvisoView {
  id: number;
  mensaje: string;
  estadoLabel: string;
  fecha: string;
  leida: boolean;
}

interface TimelineItem {
  title: string;
  date: string;
  description: string;
  active: boolean;
}

interface DetailItem {
  label: string;
  value: string;
}

interface EvidenceItem {
  label: string;
  type: string;
  imageUrl: string | null;
}

interface IncidentView {
  id: string;
  title: string;
  status: string;
  statusTone: string;
  category: string;
  priority: string;
  date: string;
  time: string;
  address: string;
  reporter: string;
  team: string;
  description: string;
}

@Component({
  selector: 'app-detalle-incidencia',
  templateUrl: 'detalle-incidencia.page.html',
  styleUrls: ['detalle-incidencia.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, HeaderComponent, FooterComponent, UiButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleIncidenciaPage {
  private readonly route = inject(ActivatedRoute);
  private readonly incidencias = inject(IncidenciasService);
  private readonly auth = inject(AuthService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly cdr = inject(ChangeDetectorRef);

  mapUrl: SafeResourceUrl;
  loading = false;
  loaded = false;
  error: string | null = null;
  photoUrl: string | null = null;

  // ── Acciones admin (cambiar estado/prioridad) ─────────────────────────────
  /** Id de la incidencia cargada (para el PATCH de admin). */
  private incidentId: number | null = null;
  /** Borradores de los selects del bloque admin. */
  adminEstado: Estado = 'abierta';
  adminPrioridad: Prioridad = 'media';
  saving = false;
  adminError: string | null = null;
  adminSuccess: string | null = null;

  // ── Avisos por incidencia (#64) ───────────────────────────────────────────
  /** Avisos (notificaciones) asociados a la incidencia cargada. */
  avisos: AvisoView[] = [];
  avisosLoading = false;
  avisosError: string | null = null;
  /** Ids de avisos cuyo PATCH /leer está en vuelo. */
  private readonly markingAvisos = new Set<number>();

  readonly estadoOptions: { value: Estado; label: string }[] = [
    { value: 'abierta', label: 'Abierta' },
    { value: 'en_progreso', label: 'En progreso' },
    { value: 'resuelta', label: 'Resuelta' },
    { value: 'rechazada', label: 'Rechazada' },
  ];

  readonly prioridadOptions: { value: Prioridad; label: string }[] = [
    { value: 'baja', label: 'Baja' },
    { value: 'media', label: 'Media' },
    { value: 'alta', label: 'Alta' },
  ];

  /** `true` si el usuario autenticado es admin (controla el bloque de acciones). */
  get isAdmin(): boolean {
    return this.auth.role() === 'admin';
  }

  constructor(private readonly sanitizer: DomSanitizer) {
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.openstreetmap.org/export/embed.html?bbox=-3.7105%2C40.4128%2C-3.6971%2C40.4214&layer=mapnik&marker=40.4168%2C-3.7038'
    );
    void this.loadIncident();
  }

  incident: IncidentView = {
    id: '',
    title: '',
    status: '',
    statusTone: 'neutral',
    category: '',
    priority: '',
    date: '',
    time: '',
    address: '',
    reporter: '',
    team: '',
    description: '',
  };

  details: DetailItem[] = [];

  evidence: EvidenceItem[] = [];

  timeline: TimelineItem[] = [];

  trackByTitle = (_index: number, item: { title: string }) => item.title;
  trackByLabel = (_index: number, item: { label: string }) => item.label;
  trackByAvisoId = (_index: number, item: AvisoView) => item.id;

  private async loadIncident() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.error = 'Incidencia no encontrada.';
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.loaded = false;
    this.error = null;
    this.cdr.markForCheck();

    try {
      const incident = await firstValueFrom(this.incidencias.obtener(id));
      this.applyIncident(incident);
      this.loaded = true;
      // Cargar los avisos de esta incidencia (no bloquea el detalle si falla).
      this.loadAvisos(id);
    } catch {
      this.error = 'No se pudo cargar el detalle de esta incidencia.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Carga los avisos (notificaciones) de la incidencia con
   * `GET /notificaciones?incidencia_id=`. Es independiente del detalle: su
   * error se muestra en la propia sección sin romper la página.
   */
  private loadAvisos(id: number): void {
    this.avisosLoading = true;
    this.avisosError = null;
    this.cdr.markForCheck();

    this.notificaciones.listar({ incidencia_id: id }).subscribe({
      next: (items) => {
        this.avisos = items.map((n) => this.toAvisoView(n));
        this.avisosLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.avisosError = 'No se pudieron cargar los avisos de esta incidencia.';
        this.avisosLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Marca un aviso como leído y actualiza el item en la lista. */
  marcarAvisoLeido(id: number): void {
    if (this.markingAvisos.has(id)) return;
    this.markingAvisos.add(id);
    this.cdr.markForCheck();

    this.notificaciones.marcarLeida(id).subscribe({
      next: (actualizada) => {
        this.avisos = this.avisos.map((a) =>
          a.id === id ? { ...this.toAvisoView(actualizada), leida: true } : a,
        );
        this.markingAvisos.delete(id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.avisosError = 'No se pudo marcar el aviso como leído. Inténtalo de nuevo.';
        this.markingAvisos.delete(id);
        this.cdr.markForCheck();
      },
    });
  }

  isMarkingAviso(id: number): boolean {
    return this.markingAvisos.has(id);
  }

  private toAvisoView(n: Notificacion): AvisoView {
    return {
      id: n.id,
      mensaje: n.mensaje,
      estadoLabel: this.formatStatus(n.estado_nuevo as Estado),
      fecha: this.formatAvisoDate(n.fecha_creacion),
      leida: n.leida,
    };
  }

  private formatAvisoDate(value: string): string {
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

  /**
   * Guarda los cambios de estado/prioridad (solo admin).
   * Llama a `actualizar()` y, al éxito, recarga el detalle (timeline + imágenes).
   */
  async saveAdminChanges(): Promise<void> {
    if (!this.isAdmin || this.incidentId === null || this.saving) return;

    this.saving = true;
    this.adminError = null;
    this.adminSuccess = null;
    this.cdr.markForCheck();

    try {
      await firstValueFrom(
        this.incidencias.actualizar(this.incidentId, {
          estado: this.adminEstado,
          prioridad: this.adminPrioridad,
        }),
      );
      this.adminSuccess = 'Cambios guardados correctamente.';
      // Recargar el detalle para refrescar timeline e imágenes con el estado real.
      await this.loadIncident();
    } catch (err) {
      this.adminError = this.messageFromError(err);
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  /** Traduce el error HTTP del PATCH a un mensaje legible para el admin. */
  private messageFromError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) return 'Sesión expirada: vuelve a iniciar sesión.';
      if (err.status === 403) return 'No tienes permisos para modificar esta incidencia.';
      if (err.status === 404) return 'La incidencia ya no existe.';
      const detail = err.error?.detail;
      if (typeof detail === 'string' && detail.trim()) return detail;
    }
    return 'No se pudieron guardar los cambios.';
  }

  private applyIncident(incident: Incidencia) {
    this.incidentId = incident.id;
    // Sembrar los selects de admin con los valores actuales de la incidencia.
    this.adminEstado = incident.estado;
    this.adminPrioridad = incident.prioridad;

    const created = this.formatDateParts(incident.fecha_creacion);
    this.incident = {
      id: `#UA-${incident.id}`,
      title: incident.titulo,
      status: this.formatStatus(incident.estado),
      statusTone: this.statusTone(incident.estado),
      category: this.formatCategory(incident.categoria),
      priority: this.formatPriority(incident.prioridad),
      date: created.date,
      time: created.time,
      address: `${incident.latitud.toFixed(5)}, ${incident.longitud.toFixed(5)}`,
      reporter: this.formatReporter(incident),
      team: this.formatTeam(incident),
      description: incident.descripcion || 'Sin descripcion adicional.',
    };

    this.details = [
      { label: 'Categoria', value: this.incident.category },
      { label: 'Prioridad', value: this.incident.priority },
      { label: 'Equipo', value: this.incident.team },
      { label: 'Fecha', value: this.incident.date },
    ];

    this.evidence = incident.imagenes.length
      ? incident.imagenes.map((image, index) => ({
          label: index === 0 ? 'Foto principal' : `Foto ${index + 1}`,
          type: this.formatDate(image.fecha_subida),
          imageUrl: this.publicUrl(image.ruta),
        }))
      : [{ label: 'Sin fotos', type: 'No hay evidencias adjuntas', imageUrl: null }];

    this.timeline = this.buildTimeline(incident.historial);

    this.photoUrl = this.imageUrl(incident);
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.openstreetmap.org/export/embed.html?bbox=${incident.longitud - 0.006}%2C${incident.latitud - 0.004}%2C${incident.longitud + 0.006}%2C${incident.latitud + 0.004}&layer=mapnik&marker=${incident.latitud}%2C${incident.longitud}`,
    );
  }

  private formatReporter(incident: Incidencia): string {
    return incident.user_id == null ? 'Anónimo' : 'Reporte ciudadano';
  }

  private formatTeam(incident: Incidencia): string {
    return incident.equipo?.nombre ?? 'Sin asignar';
  }

  private buildTimeline(historial: Historial[]): TimelineItem[] {
    return [...historial]
      .sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
      )
      .map((entry) => ({
        title: this.timelineTitle(entry),
        date: this.formatTimelineDate(entry.fecha),
        description: `Cambiado por ${entry.cambiado_por}`,
        active: true,
      }));
  }

  private timelineTitle(entry: Historial): string {
    const lines: string[] = [];

    if (entry.estado_anterior) {
      lines.push(
        `${this.formatStatus(entry.estado_anterior)} -> ${this.formatStatus(entry.estado_nuevo)}`,
      );
    } else {
      lines.push(this.formatStatus(entry.estado_nuevo));
    }

    if (entry.prioridad_anterior != null && entry.prioridad_nueva != null) {
      lines.push(
        `Prioridad: ${this.formatPriority(entry.prioridad_anterior)} -> ${this.formatPriority(entry.prioridad_nueva)}`,
      );
    }

    return lines.join(' · ');
  }

  private imageUrl(incident: Incidencia): string | null {
    return this.publicUrl(incident.imagenes?.[0]?.ruta);
  }

  private publicUrl(ruta: string | null | undefined): string | null {
    if (!ruta) return null;
    if (/^https?:\/\//i.test(ruta) || ruta.startsWith('data:')) return ruta;
    const normalizedPath = ruta.startsWith('/') ? ruta : `/${ruta}`;
    return `${environment.apiUrl}${normalizedPath}`;
  }

  private formatCategory(category: string): string {
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

  private formatPriority(priority: Prioridad): string {
    const labels: Record<Prioridad, string> = {
      baja: 'Baja',
      media: 'Media',
      alta: 'Alta',
    };
    return labels[priority] ?? priority;
  }

  private statusTone(status: Estado): string {
    const tones: Record<Estado, string> = {
      abierta: 'danger',
      en_progreso: 'warning',
      resuelta: 'success',
      rechazada: 'neutral',
    };
    return tones[status] ?? 'neutral';
  }

  private formatDateParts(value: string): { date: string; time: string } {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { date: value, time: '' };
    return {
      date: new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date),
      time: new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date),
    };
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private formatTimelineDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}

export default DetalleIncidenciaPage;
