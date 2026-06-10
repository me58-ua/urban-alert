import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
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

    fixture = TestBed.createComponent(LoginPage);
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

  it('admin -> redirige a /admin tras login', () => {
    const navSpy = spyOn(TestBed.inject(Router), 'navigateByUrl');
    component.email = 'admin@test.com';
    component.password = 'pwd';
    component.submit();

    httpMock
      .expectOne(`${base}/auth/login`)
      .flush({ access_token: 'jwt', token_type: 'bearer' });
    httpMock
      .expectOne(`${base}/auth/me`)
      .flush({ id: 1, email: 'admin@test.com', rol: 'admin' });

    expect(navSpy).toHaveBeenCalledWith('/admin');
  });

  it('ciudadano -> redirige a /home tras login', () => {
    const navSpy = spyOn(TestBed.inject(Router), 'navigateByUrl');
    component.email = 'user@test.com';
    component.password = 'pwd';
    component.submit();

    httpMock
      .expectOne(`${base}/auth/login`)
      .flush({ access_token: 'jwt', token_type: 'bearer' });
    httpMock
      .expectOne(`${base}/auth/me`)
      .flush({ id: 2, email: 'user@test.com', rol: 'ciudadano' });

    expect(navSpy).toHaveBeenCalledWith('/home');
  });

  it('muestra error si el login falla', () => {
    component.email = 'user@test.com';
    component.password = 'bad';
    component.submit();

    httpMock
      .expectOne(`${base}/auth/login`)
      .flush('nope', { status: 401, statusText: 'Unauthorized' });

    expect(component.error).toBeTruthy();
  });
});
