import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppMenuComponent } from '../shared/app-menu/app-menu.component';
import { Estado, Historial, Incidencia, IncidenciasService, Prioridad } from '../services/incidencias.service';

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
}

@Component({
  selector: 'app-detalle-incidencia',
  templateUrl: 'detalle-incidencia.page.html',
  styleUrls: ['detalle-incidencia.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, AppMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleIncidenciaPage {
  private readonly route = inject(ActivatedRoute);
  private readonly incidencias = inject(IncidenciasService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly brandMarkUrl =
    'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  mapUrl: SafeResourceUrl;
  loading = false;
  error: string | null = null;
  photoUrl: string | null = null;

  constructor(private readonly sanitizer: DomSanitizer) {
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.openstreetmap.org/export/embed.html?bbox=-3.7105%2C40.4128%2C-3.6971%2C40.4214&layer=mapnik&marker=40.4168%2C-3.7038'
    );
    void this.loadIncident();
  }

  incident = {
    id: '#UA-2048',
    title: 'Farola fundida en vía principal',
    status: 'En revisión',
    statusTone: 'warning',
    category: 'Alumbrado público',
    priority: 'Media',
    date: '09 Jun 2026',
    time: '18:40',
    address: 'Calle Mayor, 14, Madrid',
    reporter: 'Vecino verificado',
    description:
      'La farola de la esquina no funciona desde hace varios días. La zona queda oscura por la noche y dificulta el paso de peatones.',
  };

  details: DetailItem[] = [
    { label: 'Categoría', value: this.incident.category },
    { label: 'Prioridad', value: this.incident.priority },
    { label: 'Fecha', value: this.incident.date },
  ];

  evidence: EvidenceItem[] = [
    { label: 'Foto principal', type: 'Farola apagada' },
    { label: 'Vista de la calle', type: 'Zona afectada' },
    { label: 'Referencia', type: 'Ubicación exacta' },
  ];

  timeline: TimelineItem[] = [];

  trackByTitle = (_index: number, item: { title: string }) => item.title;
  trackByLabel = (_index: number, item: { label: string }) => item.label;

  private async loadIncident() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) return;

    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    try {
      const incident = await firstValueFrom(this.incidencias.obtener(id));
      this.applyIncident(incident);
    } catch {
      this.error = 'No se pudo cargar el detalle de esta incidencia.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private applyIncident(incident: Incidencia) {
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
      reporter: 'Vecino verificado',
      description: incident.descripcion || 'Sin descripcion adicional.',
    };

    this.details = [
      { label: 'Categoria', value: this.incident.category },
      { label: 'Prioridad', value: this.incident.priority },
      { label: 'Fecha', value: this.incident.date },
    ];

    this.evidence = incident.imagenes.length
      ? incident.imagenes.map((image, index) => ({
          label: index === 0 ? 'Foto principal' : `Foto ${index + 1}`,
          type: this.formatDate(image.fecha_subida),
        }))
      : [{ label: 'Sin fotos', type: 'No hay evidencias adjuntas' }];

    this.timeline = this.buildTimeline(incident.historial);

    this.photoUrl = this.imageUrl(incident);
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.openstreetmap.org/export/embed.html?bbox=${incident.longitud - 0.006}%2C${incident.latitud - 0.004}%2C${incident.longitud + 0.006}%2C${incident.latitud + 0.004}&layer=mapnik&marker=${incident.latitud}%2C${incident.longitud}`,
    );
  }

  private buildTimeline(historial: Historial[]): TimelineItem[] {
    return [...historial]
      .sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
      )
      .map((entry) => ({
        title: entry.estado_anterior
          ? `${this.formatStatus(entry.estado_anterior)} -> ${this.formatStatus(entry.estado_nuevo)}`
          : this.formatStatus(entry.estado_nuevo),
        date: this.formatTimelineDate(entry.fecha),
        description: `Cambiado por ${entry.cambiado_por}`,
        active: true,
      }));
  }

  private imageUrl(incident: Incidencia): string | null {
    const ruta = incident.imagenes?.[0]?.ruta;
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
