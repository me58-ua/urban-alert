import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AppMenuComponent } from '../shared/app-menu/app-menu.component';

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

interface CommentItem {
  author: string;
  date: string;
  message: string;
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
  readonly brandMarkUrl =
    'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  readonly mapUrl: SafeResourceUrl;

  constructor(private readonly sanitizer: DomSanitizer) {
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.openstreetmap.org/export/embed.html?bbox=-3.7105%2C40.4128%2C-3.6971%2C40.4214&layer=mapnik&marker=40.4168%2C-3.7038'
    );
  }

  readonly incident = {
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

  readonly details: DetailItem[] = [
    { label: 'Categoría', value: this.incident.category },
    { label: 'Prioridad', value: this.incident.priority },
    { label: 'Fecha', value: this.incident.date },
  ];

  readonly evidence: EvidenceItem[] = [
    { label: 'Foto principal', type: 'Farola apagada' },
    { label: 'Vista de la calle', type: 'Zona afectada' },
    { label: 'Referencia', type: 'Ubicación exacta' },
  ];

  readonly comments: CommentItem[] = [
    {
      author: 'María G.',
      date: 'Hoy, 19:12',
      message:
        'Confirmo que la zona queda muy oscura al cruzar. También afecta a la parada cercana.',
    },
    {
      author: 'Carlos R.',
      date: 'Hoy, 19:28',
      message:
        'Hay otra farola intermitente unos metros más adelante, junto al paso de peatones.',
    },
  ];

  readonly timeline: TimelineItem[] = [
    {
      title: 'Reporte recibido',
      date: '09 Jun, 18:40',
      description: 'La incidencia fue registrada correctamente.',
      active: true,
    },
    {
      title: 'En revisión municipal',
      date: '09 Jun, 19:05',
      description: 'El equipo de alumbrado está validando la ubicación.',
      active: true,
    },
    {
      title: 'Asignación de cuadrilla',
      date: 'Pendiente',
      description: 'Se notificará al ciudadano cuando el trabajo sea asignado.',
      active: false,
    },
    {
      title: 'Resuelta',
      date: 'Pendiente',
      description: 'Cierre y confirmacion final de la reparacion.',
      active: false,
    },
  ];

  trackByTitle = (_index: number, item: { title: string }) => item.title;
  trackByLabel = (_index: number, item: { label: string }) => item.label;
  trackByAuthor = (_index: number, item: { author: string }) => item.author;
}

export default DetalleIncidenciaPage;
