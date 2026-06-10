import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { catchError, map, of, startWith } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppMenuComponent } from '../shared/app-menu/app-menu.component';
import { Estado, Incidencia, IncidenciasService, Prioridad } from '../services/incidencias.service';

interface IncidenciasViewModel {
  incidents: Incidencia[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-mis-incidencias',
  templateUrl: 'mis-incidencias.page.html',
  styleUrls: ['mis-incidencias.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, AppMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisIncidenciasPage {
  private readonly incidencias = inject(IncidenciasService);

  readonly brandMarkUrl =
    'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  readonly vm$ = this.incidencias.listar().pipe(
    map((incidents): IncidenciasViewModel => ({ incidents, loading: false, error: null })),
    startWith({ incidents: [], loading: true, error: null }),
    catchError(() =>
      of({
        incidents: [],
        loading: false,
        error: 'No se pudieron cargar tus incidencias. Intentalo de nuevo en unos minutos.',
      }),
    ),
  );

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
