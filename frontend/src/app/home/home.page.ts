import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../shared/header/header.component';
import { FooterComponent } from '../shared/footer/footer.component';
import { UiButtonComponent } from '../shared/ui-button/ui-button.component';

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

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, HeaderComponent, FooterComponent, UiButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements AfterViewInit {
  @ViewChild('heroVideo') private readonly heroVideo?: ElementRef<HTMLVideoElement>;

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

  ngAfterViewInit(): void {
    // Angular no refleja el atributo estatico `muted` a la propiedad del <video>,
    // por lo que el navegador bloquea el autoplay (solo permite autoplay sin sonido).
    // Forzamos muted=true por codigo y arrancamos la reproduccion.
    const video = this.heroVideo?.nativeElement;
    if (video) {
      video.muted = true;
      void video.play().catch(() => {
        /* Si el navegador bloquea el autoplay, el video queda visible igualmente. */
      });
    }
  }

  trackByLabel = (_index: number, item: { label: string }) => item.label;
  trackByTitle = (_index: number, item: { title: string }) => item.title;
}
