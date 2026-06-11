import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('usa el logo de marca local (no la URL de Figma)', () => {
    expect(component.brandMarkUrl).toBe('assets/media/images/logo-v3.png');
    const img: HTMLImageElement | null =
      fixture.nativeElement.querySelector('.app-footer__mark img');
    expect(img?.getAttribute('src')).toBe('assets/media/images/logo-v3.png');
  });

  it('muestra el nombre de marca "Urban Alert"', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.app-footer__brand-name')?.textContent?.trim()).toBe(
      'Urban Alert',
    );
  });

  it('el copyright incluye el año 2026 y la frase de derechos', () => {
    expect(component.year).toBe(2026);
    expect(component.copyright).toContain('2026');
    expect(component.copyright).toBe(
      '© 2026 Urban Alert. Todos los derechos reservados.',
    );

    const copy = fixture.nativeElement.querySelector('.app-footer__copy');
    expect(copy?.textContent?.trim()).toBe(component.copyright);
  });

  it('la columna de navegación expone los enlaces reales con routerLink', () => {
    const routes = component.navLinks.map((l) => l.route);
    expect(routes).toEqual([
      '/home',
      '/mapa-incidencias',
      '/crear-incidencia',
      '/mis-incidencias',
      '/notificaciones',
    ]);

    // Cada enlace de navegación se renderiza con un routerLink (href resuelto).
    const navAnchors: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll(
        'nav[aria-label="Navegación del sitio"] a.app-footer__link',
      ),
    );
    expect(navAnchors.length).toBe(component.navLinks.length);
    navAnchors.forEach((a) => {
      expect(a.getAttribute('href')).toBeTruthy();
    });
  });

  it('la columna legal son placeholders (href="#") y no rompen al pulsarlos', () => {
    const labels = component.legalLinks.map((l) => l.label);
    expect(labels).toEqual([
      'Política de privacidad',
      'Términos del servicio',
      'Contacto',
      'Registro municipal',
    ]);

    const legalAnchors: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll(
        'nav[aria-label="Legal y plataforma"] a.app-footer__link',
      ),
    );
    expect(legalAnchors.length).toBe(component.legalLinks.length);
    legalAnchors.forEach((a) => {
      expect(a.getAttribute('href')).toBe('#');
      // El click no debe provocar navegación real (preventDefault en plantilla).
      const event = new MouseEvent('click', { cancelable: true });
      a.dispatchEvent(event);
      expect(event.defaultPrevented).toBeTrue();
    });
  });

  it('las navegaciones tienen aria-label para accesibilidad', () => {
    const navLabels = Array.from(
      fixture.nativeElement.querySelectorAll('nav'),
    ).map((n) => (n as HTMLElement).getAttribute('aria-label'));
    expect(navLabels).toContain('Navegación del sitio');
    expect(navLabels).toContain('Legal y plataforma');
  });

  it('renderiza iconos sociales decorativos con aria-label propio', () => {
    const socialAnchors: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.app-footer__social-link'),
    );
    expect(socialAnchors.length).toBe(component.socials.length);
    socialAnchors.forEach((a, i) => {
      expect(a.getAttribute('aria-label')).toBe(component.socials[i].label);
    });
  });

  it('trackByLabel devuelve la etiqueta del item', () => {
    expect(component.trackByLabel(0, { label: 'Inicio' })).toBe('Inicio');
  });
});
