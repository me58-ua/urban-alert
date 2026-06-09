import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleIncidenciaPage } from './detalle-incidencia.page';

describe('DetalleIncidenciaPage', () => {
  let component: DetalleIncidenciaPage;
  let fixture: ComponentFixture<DetalleIncidenciaPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(DetalleIncidenciaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
