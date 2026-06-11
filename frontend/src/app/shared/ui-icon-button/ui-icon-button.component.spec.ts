import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UiIconButtonComponent } from './ui-icon-button.component';

@Component({
  standalone: true,
  imports: [UiIconButtonComponent],
  template: `<app-ui-icon-button
    [variant]="variant"
    [icon]="icon"
    [ariaLabel]="ariaLabel"
    [disabled]="disabled"
  ></app-ui-icon-button>`,
})
class HostComponent {
  variant: 'default' | 'danger' | 'success' = 'default';
  icon = 'create-outline';
  ariaLabel = 'Editar';
  disabled = false;
}

describe('UiIconButtonComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function button(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button');
  }

  it('renderiza un <button> con el aria-label recibido', () => {
    expect(button()).toBeTruthy();
    expect(button().getAttribute('aria-label')).toBe('Editar');
  });

  it('pasa el icono al ion-icon', () => {
    const icon = button().querySelector('ion-icon') as HTMLElement & { name?: string };
    expect(icon?.name).toBe('create-outline');
  });

  it('aplica el modificador de la variante danger', () => {
    fixture.componentInstance.variant = 'danger';
    fixture.detectChanges();
    expect(button().classList).toContain('ui-icon-button__native--danger');
  });

  it('aplica el modificador de la variante success', () => {
    fixture.componentInstance.variant = 'success';
    fixture.detectChanges();
    expect(button().classList).toContain('ui-icon-button__native--success');
  });

  it('propaga el estado disabled', () => {
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    expect(button().disabled).toBe(true);
  });
});
