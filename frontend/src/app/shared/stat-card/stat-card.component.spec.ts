import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatCardComponent } from './stat-card.component';

@Component({
  standalone: true,
  imports: [StatCardComponent],
  template: `<article
    appStatCard
    [tone]="tone"
    [icon]="icon"
    [label]="label"
    [value]="value"
  ></article>`,
})
class HostComponent {
  tone: 'blue' | 'amber' | 'green' | 'red' = 'blue';
  icon = 'people-outline';
  label = 'Usuarios totales';
  value: string | number = 12;
}

describe('StatCardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function article(): HTMLElement {
    return fixture.nativeElement.querySelector('article');
  }

  it('se renderiza como un <article> con la clase compartida .metric-card', () => {
    const el = article();
    expect(el).toBeTruthy();
    expect(el.classList).toContain('metric-card');
  });

  it('pinta la etiqueta y el valor recibidos', () => {
    const el = article();
    expect(el.querySelector('.metric-card__label')?.textContent?.trim()).toBe('Usuarios totales');
    expect(el.querySelector('strong')?.textContent?.trim()).toBe('12');
  });

  it('pasa el icono al ion-icon', () => {
    // ion-icon consume el atributo `name` al hidratarse, así que leemos la
    // propiedad del elemento (que refleja el @Input bindeado) en vez del attr.
    const icon = article().querySelector('ion-icon') as HTMLElement & { name?: string };
    expect(icon?.name).toBe('people-outline');
  });

  it('aplica el modificador de tono correspondiente', () => {
    expect(article().classList).toContain('metric-card--blue');

    fixture.componentInstance.tone = 'green';
    fixture.detectChanges();

    const el = article();
    expect(el.classList).toContain('metric-card--green');
    expect(el.classList).not.toContain('metric-card--blue');
  });
});
