import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

/** Enlace de navegación interna del pie (con destino `routerLink`). */
interface FooterNavLink {
  label: string;
  route: string;
  icon: string;
}

/**
 * Enlace legal / de plataforma. De momento son placeholders sin destino real
 * (`href="#"`), pero se estilizan como enlaces accesibles.
 */
interface FooterLegalLink {
  label: string;
}

/** Icono social decorativo de la barra inferior. */
interface FooterSocial {
  icon: string;
  label: string;
}

/**
 * Pie de página de marca reutilizable, moderno y responsive.
 *
 * Renderiza un `<footer>` con un grid de columnas que se apilan en móvil:
 *  - MARCA: logo (`logo-v3.png`) + "Urban Alert" + una breve descripción.
 *  - NAVEGACIÓN: enlaces reales con `routerLink` (Inicio, Mapa, Reportar,
 *    Mis incidencias, Notificaciones).
 *  - LEGAL / PLATAFORMA: enlaces placeholder (Política de privacidad, Términos
 *    del servicio, Contacto, Registro municipal), estilizados como enlaces.
 *
 * Bajo el grid hay una barra inferior con el copyright (2026) y unos iconos
 * sociales decorativos.
 *
 * Es `standalone` y `OnPush`; no tiene estado mutable: solo expone datos de
 * presentación, por lo que no necesita servicios ni `signals`.
 */
@Component({
  selector: 'app-footer',
  templateUrl: 'footer.component.html',
  styleUrls: ['footer.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  /** URL del logo de marca (no usar la URL de Figma). */
  readonly brandMarkUrl = 'assets/media/images/logo-v3.png';

  /** Texto del logo / nombre de marca. */
  readonly brandName = 'Urban Alert';

  /** Breve descripción de marca para la columna principal. */
  readonly brandDescription =
    'Plataforma ciudadana para reportar y seguir incidencias urbanas, ' +
    'conectando a la ciudadanía con los servicios municipales.';

  /** Año del copyright. */
  readonly year = 2026;

  /** Texto completo del copyright mostrado en la barra inferior. */
  readonly copyright = `© ${this.year} Urban Alert. Todos los derechos reservados.`;

  /** Columna de NAVEGACIÓN: enlaces internos reales con `routerLink`. */
  readonly navLinks: FooterNavLink[] = [
    { label: 'Inicio', route: '/home', icon: 'home-outline' },
    { label: 'Mapa', route: '/mapa-incidencias', icon: 'map-outline' },
    { label: 'Reportar', route: '/crear-incidencia', icon: 'add-circle-outline' },
    { label: 'Mis incidencias', route: '/mis-incidencias', icon: 'document-text-outline' },
    { label: 'Notificaciones', route: '/notificaciones', icon: 'notifications-outline' },
  ];

  /** Columna LEGAL / PLATAFORMA: enlaces placeholder (sin destino real). */
  readonly legalLinks: FooterLegalLink[] = [
    { label: 'Política de privacidad' },
    { label: 'Términos del servicio' },
    { label: 'Contacto' },
    { label: 'Registro municipal' },
  ];

  /** Iconos sociales decorativos de la barra inferior. */
  readonly socials: FooterSocial[] = [
    { icon: 'logo-twitter', label: 'Twitter' },
    { icon: 'logo-facebook', label: 'Facebook' },
    { icon: 'logo-instagram', label: 'Instagram' },
    { icon: 'logo-github', label: 'GitHub' },
  ];

  trackByLabel = (_index: number, item: { label: string }) => item.label;
}
