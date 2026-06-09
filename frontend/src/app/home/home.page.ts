import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AppMenuComponent } from '../shared/app-menu/app-menu.component';

interface CategoryItem {
  label: string;
  icon: string;
}

interface StepItem {
  number: string;
  title: string;
  description: string;
  tone: 'dark' | 'blue' | 'accent';
}

interface TrustPoint {
  title: string;
  description: string;
  icon: string;
}

interface MetricItem {
  value: string;
  label: string;
}

interface HeaderLink {
  label: string;
  active: boolean;
  href?: string;
  route?: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, AppMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  readonly brandMarkUrl = 'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  readonly headerLinks: HeaderLink[] = [
    { label: 'Report an Incident', href: '#hero', active: true },
    { label: 'View Map', route: '/mapa-incidencias', active: false },
  ];

  readonly categories: CategoryItem[] = [
    { label: 'Alumbrado', icon: 'bulb-outline' },
    { label: 'Basura', icon: 'trash-outline' },
    { label: 'Baches', icon: 'construct-outline' },
    { label: 'Vandalismo', icon: 'alert-circle-outline' },
    { label: 'Mobiliario', icon: 'business-outline' },
  ];

  readonly steps: StepItem[] = [
    {
      number: '1',
      title: 'Reporta',
      description:
        'Captura una foto de la incidencia, selecciona la categoría y marca la ubicación exacta en el mapa desde tu móvil.',
      tone: 'dark',
    },
    {
      number: '2',
      title: 'Sigue',
      description:
        'Recibe notificaciones en tiempo real sobre el estado de tu reporte. Consulta cuándo ha sido asignado y revisado.',
      tone: 'blue',
    },
    {
      number: '3',
      title: 'Resuelve',
      description:
        'Una vez solucionado, recibirás la confirmación final. Tu barrio ahora es un lugar mejor gracias a tu colaboración.',
      tone: 'accent',
    },
  ];

  readonly trustPoints: TrustPoint[] = [
    {
      title: 'Gestión unificada',
      description:
        'Todos los departamentos municipales operan bajo el mismo panel para evitar retrasos.',
      icon: 'shield-checkmark-outline',
    },
    {
      title: 'Privacidad garantizada',
      description:
        'Tus datos personales se tratan con estricta seguridad conforme a la RGPD.',
      icon: 'lock-closed-outline',
    },
    {
      title: 'Identidad ciudadana',
      description:
        'Inicia sesión con tu cuenta municipal para validar los reportes y evitar duplicados.',
      icon: 'person-circle-outline',
    },
  ];

  readonly metrics: MetricItem[] = [
    { value: '94%', label: 'Resolución' },
    { value: '24h', label: 'Respuesta media' },
    { value: '12k', label: 'Incidencias cerradas' },
    { value: '8.5', label: 'Nota ciudadana' },
  ];

  readonly footerLinks = [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Contact Support', href: '#' },
    { label: 'City Registry', href: '#' },
  ];

  trackByLabel = (_index: number, item: { label: string }) => item.label;
  trackByTitle = (_index: number, item: { title: string }) => item.title;
  trackByValue = (_index: number, item: { value: string }) => item.value;
}
