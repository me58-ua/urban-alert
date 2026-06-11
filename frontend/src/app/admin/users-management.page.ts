import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../services/auth.service';
import { Rol, Usuario, UsersService } from '../services/users.service';

interface AdminMenuItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-users-management',
  templateUrl: 'users-management.page.html',
  styleUrls: ['users-management.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersManagementPage implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly brandMarkUrl =
    'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  readonly isMenuOpen = signal(false);
  readonly popoverEvent = signal<Event | undefined>(undefined);
  readonly editingUserId = signal<number | null>(null);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // ── Paginación (#62) ───────────────────────────────────────────────────────
  readonly limit = 20;
  readonly offset = signal(0);
  readonly total = signal(0);

  /** Texto "X-Y de total" para el pie de paginación (1-based, vacío si no hay datos). */
  readonly rangeLabel = computed(() => {
    const total = this.total();
    if (total === 0) return '0 de 0';
    const start = this.offset() + 1;
    const end = Math.min(this.offset() + this.limit, total);
    return `${start}-${end} de ${total}`;
  });

  readonly canPrev = computed(() => this.offset() > 0);
  readonly canNext = computed(() => this.offset() + this.limit < this.total());

  readonly menuItems: AdminMenuItem[] = [
    { label: 'Dashboard', route: '/admin', icon: 'grid-outline' },
    { label: 'Incidencias', route: '/admin/incidencias', icon: 'document-text-outline' },
    { label: 'Equipos', route: '/admin/equipos', icon: 'people-circle-outline' },
    { label: 'Usuarios', route: '/admin/usuarios', icon: 'person-circle-outline' },
    { label: 'Mapa ciudadano', route: '/mapa-incidencias', icon: 'map-outline' },
    { label: 'Vista ciudadana', route: '/home', icon: 'people-outline' },
  ];

  readonly users = signal<Usuario[]>([]);

  newUser: { email: string; password: string; rol: Rol } = {
    email: '',
    password: '',
    rol: 'ciudadano',
  };

  draftEmail = '';

  readonly adminCount = computed(
    () => this.users().filter((user) => user.rol === 'admin').length,
  );
  readonly activeCount = computed(
    () => this.users().filter((user) => user.activo).length,
  );

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);
    this.usersService.listar(this.limit, this.offset()).subscribe({
      next: (page) => {
        this.users.set(page.items);
        this.total.set(page.total);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.messageFromError(err, 'No se pudieron cargar los usuarios.'));
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  /** Página anterior: retrocede un bloque de `limit` y recarga. */
  prevPage(): void {
    if (!this.canPrev()) return;
    this.offset.set(Math.max(0, this.offset() - this.limit));
    this.loadUsers();
  }

  /** Página siguiente: avanza un bloque de `limit` y recarga. */
  nextPage(): void {
    if (!this.canNext()) return;
    this.offset.set(this.offset() + this.limit);
    this.loadUsers();
  }

  openMenu(event: Event) {
    this.popoverEvent.set(event);
    this.isMenuOpen.set(true);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
    this.popoverEvent.set(undefined);
  }

  /** Cierra la sesión y redirige al login. */
  logout() {
    this.closeMenu();
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  createUser() {
    const email = this.newUser.email.trim();
    const password = this.newUser.password;
    if (!email || !password) return;

    this.error.set(null);
    this.usersService
      .crear({ email, password, rol: this.newUser.rol })
      .subscribe({
        next: () => {
          this.newUser = { email: '', password: '', rol: 'ciudadano' };
          this.loadUsers();
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(this.messageFromError(err, 'No se pudo crear el usuario.'));
          this.cdr.markForCheck();
        },
      });
  }

  startEdit(user: Usuario) {
    this.editingUserId.set(user.id);
    this.draftEmail = user.email;
  }

  cancelEdit() {
    this.editingUserId.set(null);
    this.draftEmail = '';
  }

  saveEdit(userId: number) {
    const email = this.draftEmail.trim();
    if (!email) return;

    this.error.set(null);
    this.usersService.actualizarEmail(userId, email).subscribe({
      next: () => {
        this.cancelEdit();
        this.loadUsers();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.messageFromError(err, 'No se pudo actualizar el email.'));
        this.cdr.markForCheck();
      },
    });
  }

  deleteUser(userId: number) {
    this.error.set(null);
    this.usersService.eliminar(userId).subscribe({
      next: () => {
        if (this.editingUserId() === userId) this.cancelEdit();
        this.loadUsers();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.messageFromError(err, 'No se pudo eliminar el usuario.'));
        this.cdr.markForCheck();
      },
    });
  }

  changeRole(userId: number, rol: Rol) {
    this.error.set(null);
    this.usersService.cambiarRol(userId, rol).subscribe({
      next: () => this.loadUsers(),
      error: (err: HttpErrorResponse) => {
        this.error.set(this.messageFromError(err, 'No se pudo cambiar el rol.'));
        this.cdr.markForCheck();
      },
    });
  }

  changeEstado(userId: number, activo: boolean) {
    this.error.set(null);
    this.usersService.cambiarEstado(userId, activo).subscribe({
      next: () => this.loadUsers(),
      error: (err: HttpErrorResponse) => {
        this.error.set(this.messageFromError(err, 'No se pudo cambiar el estado.'));
        this.cdr.markForCheck();
      },
    });
  }

  roleLabel(rol: Rol): string {
    return rol === 'admin' ? 'Admin' : 'Ciudadano';
  }

  estadoLabel(activo: boolean): string {
    return activo ? 'Activo' : 'Inactivo';
  }

  /**
   * Extrae un mensaje legible del error del backend.
   * FastAPI suele devolver `{ detail: '…' }` (string) en los 400.
   */
  private messageFromError(err: HttpErrorResponse, fallback: string): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length && detail[0]?.msg) {
      return String(detail[0].msg);
    }
    if (typeof err?.error === 'string' && err.error.trim()) return err.error;
    return fallback;
  }

  trackByUserId = (_index: number, item: Usuario) => item.id;
  trackByMenuLabel = (_index: number, item: AdminMenuItem) => item.label;
}

export default UsersManagementPage;
