import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { UiButtonComponent } from './ui-button.component';

@Component({
  standalone: true,
  imports: [UiButtonComponent],
  template: `<app-ui-button
    [variant]="variant"
    [size]="size"
    [expand]="expand"
    [fill]="fill"
    [icon]="icon"
    [iconSlot]="iconSlot"
    [type]="type"
    [disabled]="disabled"
    [ariaLabel]="ariaLabel"
  >Aceptar</app-ui-button>`,
})
class HostComponent {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'primary';
  size: 'small' | 'default' | 'large' = 'default';
  expand: 'block' | 'full' | null = null;
  fill: 'solid' | 'outline' | 'clear' | null = null;
  icon: string | null = null;
  iconSlot: 'start' | 'end' = 'start';
  type: 'button' | 'submit' | 'reset' = 'button';
  disabled = false;
  ariaLabel: string | null = null;
}

describe('UiButtonComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function host(): HTMLElement {
    return fixture.nativeElement.querySelector('app-ui-button');
  }

  function ionButton(): HTMLElement & { type?: string; fill?: string; disabled?: boolean } {
    return host().querySelector('ion-button') as HTMLElement & {
      type?: string;
      fill?: string;
      disabled?: boolean;
    };
  }

  it('renderiza un ion-button con el contenido proyectado', () => {
    expect(ionButton()).toBeTruthy();
    expect(host().textContent?.trim()).toContain('Aceptar');
  });

  it('aplica la clase de la variante en el host', () => {
    expect(host().classList).toContain('ui-button--primary');

    fixture.componentInstance.variant = 'danger';
    fixture.detectChanges();
    expect(host().classList).toContain('ui-button--danger');
    expect(host().classList).not.toContain('ui-button--primary');
  });

  it('usa fill solid por defecto y clear para la variante ghost', () => {
    expect(ionButton().fill).toBe('solid');

    fixture.componentInstance.variant = 'ghost';
    fixture.detectChanges();
    expect(ionButton().fill).toBe('clear');
  });

  it('respeta un fill explícito por encima del de la variante', () => {
    fixture.componentInstance.variant = 'ghost';
    fixture.componentInstance.fill = 'outline';
    fixture.detectChanges();
    expect(ionButton().fill).toBe('outline');
  });

  it('propaga type y disabled al ion-button', () => {
    fixture.componentInstance.type = 'submit';
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    expect(ionButton().type).toBe('submit');
    expect(ionButton().disabled).toBe(true);
  });

  it('marca la clase de bloque cuando expand es block', () => {
    fixture.componentInstance.expand = 'block';
    fixture.detectChanges();
    expect(host().classList).toContain('ui-button--block');
  });

  it('pinta el icono en el slot indicado cuando se pasa icon', () => {
    fixture.componentInstance.icon = 'map-outline';
    fixture.componentInstance.iconSlot = 'end';
    fixture.detectChanges();

    const icon = ionButton().querySelector('ion-icon') as HTMLElement & { name?: string };
    expect(icon).toBeTruthy();
    expect(icon.name).toBe('map-outline');
    expect(icon.getAttribute('slot')).toBe('end');
  });
});
