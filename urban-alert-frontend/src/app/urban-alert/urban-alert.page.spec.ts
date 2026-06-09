import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UrbanAlertPage } from './urban-alert.page';

describe('UrbanAlertPage', () => {
  let component: UrbanAlertPage;
  let fixture: ComponentFixture<UrbanAlertPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UrbanAlertPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
