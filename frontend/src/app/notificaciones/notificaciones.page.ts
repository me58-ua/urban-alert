import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { HeaderComponent } from '../shared/header/header.component';
import { FooterComponent } from '../shared/footer/footer.component';
import { Notificacion, NotificacionesService } from '../services/notificaciones.service';

@Component({
  selector: 'app-notificaciones',
  templateUrl: 'notificaciones.page.html',
  styleUrls: ['notificaciones.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, HeaderComponent, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificacionesPage {
  private readonly notificaciones = inject(NotificacionesService);

  readonly items = signal<Notificacion[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  /** Ids de notificaciones cuyo PATCH /leer está en vuelo. */
  readonly marking = signal<ReadonlySet<number>>(new Set());

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notificaciones.listar().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(
          'No se pudieron cargar las notificaciones. Intentalo de nuevo en unos minutos.',
        );
        this.loading.set(false);
      },
    });
  }

  marcarLeida(id: number): void {
    if (this.marking().has(id)) return;
    this.marking.update((set) => new Set(set).add(id));

    this.notificaciones.marcarLeida(id).subscribe({
      next: (actualizada) => {
        this.items.update((items) =>
          items.map((n) => (n.id === id ? { ...n, ...actualizada, leida: true } : n)),
        );
        this.clearMarking(id);
      },
      error: () => {
        this.error.set('No se pudo marcar la notificacion como leida. Intentalo de nuevo.');
        this.clearMarking(id);
      },
    });
  }

  isMarking(id: number): boolean {
    return this.marking().has(id);
  }

  private clearMarking(id: number): void {
    this.marking.update((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
  }

  formatStatus(status: string): string {
    const labels: Record<string, string> = {
      abierta: 'Abierta',
      en_progreso: 'En progreso',
      resuelta: 'Resuelta',
      rechazada: 'Rechazada',
    };
    return labels[status] ?? this.titleize(status);
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

  private titleize(value: string): string {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  trackById = (_index: number, item: Notificacion) => item.id;
}

export default NotificacionesPage;
