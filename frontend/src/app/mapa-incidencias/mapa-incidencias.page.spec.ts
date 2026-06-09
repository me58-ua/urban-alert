import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapaIncidenciasPage } from './mapa-incidencias.page';

describe('MapaIncidenciasPage', () => {
  let component: MapaIncidenciasPage;
  let fixture: ComponentFixture<MapaIncidenciasPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(MapaIncidenciasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
