import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

interface TimelineItem {
  title: string;
  date: string;
  description: string;
  active: boolean;
}

interface DetailItem {
  label: string;
  value: string;
  icon: string;
}

@Component({
  selector: 'app-detalle-incidencia',
  templateUrl: 'detalle-incidencia.page.html',
  styleUrls: ['detalle-incidencia.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleIncidenciaPage {
  readonly brandMarkUrl =
    'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  readonly incident = {
    id: '#UA-2048',
    title: 'Farola fundida en via principal',
    status: 'En revision',
    statusTone: 'warning',
    category: 'Alumbrado publico',
    priority: 'Media',
    date: '09 Jun 2026',
    time: '18:40',
    address: 'Calle Mayor, 14, Madrid',
    reporter: 'Vecino verificado',
    description:
      'La farola de la esquina no funciona desde hace varios dias. La zona queda oscura por la noche y dificulta el paso de peatones.',
  };

  readonly details: DetailItem[] = [
    { label: 'Categoria', value: this.incident.category, icon: 'bulb-outline' },
    { label: 'Prioridad', value: this.incident.priority, icon: 'flag-outline' },
    { label: 'Fecha', value: this.incident.date, icon: 'calendar-outline' },
    { label: 'Hora', value: this.incident.time, icon: 'time-outline' },
  ];

  readonly timeline: TimelineItem[] = [
    {
      title: 'Reporte recibido',
      date: '09 Jun, 18:40',
      description: 'La incidencia fue registrada correctamente.',
      active: true,
    },
    {
      title: 'En revision municipal',
      date: '09 Jun, 19:05',
      description: 'El equipo de alumbrado esta validando la ubicacion.',
      active: true,
    },
    {
      title: 'Asignacion de cuadrilla',
      date: 'Pendiente',
      description: 'Se notificara al ciudadano cuando el trabajo sea asignado.',
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
}

export default DetalleIncidenciaPage;
