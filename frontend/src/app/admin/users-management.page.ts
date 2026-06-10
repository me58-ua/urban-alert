import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

type UserRole = 'ciudadano' | 'admin';
type UserStatus = 'activo' | 'bloqueado';

interface AdminMenuItem {
  label: string;
  route: string;
  icon: string;
}

interface PlatformUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  registeredAt: string;
}

@Component({
  selector: 'app-users-management',
  templateUrl: 'users-management.page.html',
  styleUrls: ['users-management.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersManagementPage {
  readonly brandMarkUrl =
    'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  readonly isMenuOpen = signal(false);
  readonly popoverEvent = signal<Event | undefined>(undefined);
  readonly editingUserId = signal<number | null>(null);

  readonly menuItems: AdminMenuItem[] = [
    { label: 'Dashboard', route: '/admin', icon: 'grid-outline' },
    { label: 'Equipos', route: '/admin/equipos', icon: 'people-circle-outline' },
    { label: 'Usuarios', route: '/admin/usuarios', icon: 'person-circle-outline' },
    { label: 'Mapa ciudadano', route: '/mapa-incidencias', icon: 'map-outline' },
    { label: 'Vista ciudadana', route: '/home', icon: 'people-outline' },
  ];

  readonly users = signal<PlatformUser[]>([
    {
      id: 1,
      name: 'Maha Admin',
      email: 'admin@urban-alert.local',
      phone: '+34 600 100 200',
      role: 'admin',
      status: 'activo',
      registeredAt: '2026-05-28',
    },
    {
      id: 2,
      name: 'Laura Martin',
      email: 'laura@example.com',
      phone: '+34 600 200 300',
      role: 'ciudadano',
      status: 'activo',
      registeredAt: '2026-06-01',
    },
    {
      id: 3,
      name: 'Diego Cano',
      email: 'diego@example.com',
      phone: '+34 600 300 400',
      role: 'ciudadano',
      status: 'bloqueado',
      registeredAt: '2026-06-04',
    },
  ]);

  newUser: Omit<PlatformUser, 'id' | 'registeredAt'> = {
    name: '',
    email: '',
    phone: '',
    role: 'ciudadano',
    status: 'activo',
  };

  draftUser: PlatformUser | null = null;

  readonly adminCount = computed(() => this.users().filter((user) => user.role === 'admin').length);
  readonly activeCount = computed(() => this.users().filter((user) => user.status === 'activo').length);

  openMenu(event: Event) {
    this.popoverEvent.set(event);
    this.isMenuOpen.set(true);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
    this.popoverEvent.set(undefined);
  }

  createUser() {
    const name = this.newUser.name.trim();
    const email = this.newUser.email.trim();
    if (!name || !email) return;

    const nextId = Math.max(0, ...this.users().map((user) => user.id)) + 1;
    this.users.update((users) => [
      ...users,
      {
        ...this.newUser,
        id: nextId,
        name,
        email,
        phone: this.newUser.phone.trim(),
        registeredAt: new Date().toISOString().slice(0, 10),
      },
    ]);

    this.newUser = {
      name: '',
      email: '',
      phone: '',
      role: 'ciudadano',
      status: 'activo',
    };
  }

  startEdit(user: PlatformUser) {
    this.editingUserId.set(user.id);
    this.draftUser = { ...user };
  }

  cancelEdit() {
    this.editingUserId.set(null);
    this.draftUser = null;
  }

  saveEdit() {
    if (!this.draftUser) return;
    const updated = {
      ...this.draftUser,
      name: this.draftUser.name.trim(),
      email: this.draftUser.email.trim(),
      phone: this.draftUser.phone.trim(),
    };
    if (!updated.name || !updated.email) return;

    this.users.update((users) => users.map((user) => (user.id === updated.id ? updated : user)));
    this.cancelEdit();
  }

  deleteUser(userId: number) {
    this.users.update((users) => users.filter((user) => user.id !== userId));
    if (this.editingUserId() === userId) this.cancelEdit();
  }

  changeRole(userId: number, role: UserRole) {
    this.users.update((users) => users.map((user) => (user.id === userId ? { ...user, role } : user)));
  }

  changeStatus(userId: number, status: UserStatus) {
    this.users.update((users) => users.map((user) => (user.id === userId ? { ...user, status } : user)));
  }

  roleLabel(role: UserRole): string {
    return role === 'admin' ? 'Admin' : 'Ciudadano';
  }

  statusLabel(status: UserStatus): string {
    return status === 'activo' ? 'Activo' : 'Bloqueado';
  }

  trackByUserId = (_index: number, item: PlatformUser) => item.id;
  trackByMenuLabel = (_index: number, item: AdminMenuItem) => item.label;
}

export default UsersManagementPage;
