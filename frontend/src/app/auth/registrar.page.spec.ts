import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { RegistrarPage } from './registrar.page';

describe('RegistrarPage', () => {
  let component: RegistrarPage;
  let fixture: ComponentFixture<RegistrarPage>;
  let httpMock: HttpTestingController;
  const base = environment.apiUrl;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrarPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('registra y navega a /login en éxito', () => {
    const navSpy = spyOn(TestBed.inject(Router), 'navigateByUrl');
    component.email = 'new@test.com';
    component.password = 'pwd';
    component.submit();

    const req = httpMock.expectOne(`${base}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'new@test.com', password: 'pwd' });
    req.flush({ id: 1, email: 'new@test.com', rol: 'ciudadano' });

    expect(navSpy).toHaveBeenCalledWith('/login');
  });

  it('muestra error si el registro falla', () => {
    component.email = 'dup@test.com';
    component.password = 'pwd';
    component.submit();

    httpMock
      .expectOne(`${base}/auth/register`)
      .flush('exists', { status: 400, statusText: 'Bad Request' });

    expect(component.error).toBeTruthy();
  });
});
