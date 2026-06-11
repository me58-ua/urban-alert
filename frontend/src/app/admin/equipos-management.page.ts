import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../services/auth.service';
import { Categoria, Equipo, EquiposService } from '../services/equipos.service';
import { Incidencia, IncidenciasService } from '../services/incidencias.service';

interface AdminMenuItem {
  label: string;
  route: string;
  icon: string;
}

/** Las 6 categorías del backend con su etiqueta legible. */
interface CategoriaOption {
  value: Categoria;
  label: string;
}

@Component({
  selector: 'app-equipos-management',
  templateUrl: 'equipos-management.page.html',
  styleUrls: ['equipos-management.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquiposManagementPage implements OnInit {
  private readonly equiposService = inject(EquiposService);
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly brandMarkUrl =
    'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  readonly isMenuOpen = signal(false);
  readonly popoverEvent = signal<Event | undefined>(undefined);
  readonly selectedTeamId = signal<number | null>(null);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly incidentsLoading = signal(false);
  readonly incidentsError = signal<string | null>(null);
  readonly assignError = signal<string | null>(null);
  readonly assignSuccess = signal<string | null>(null);

  readonly menuItems: AdminMenuItem[] = [
    { label: 'Dashboard', route: '/admin', icon: 'grid-outline' },
    { label: 'Incidencias', route: '/admin/incidencias', icon: 'document-text-outline' },
    { label: 'Equipos', route: '/admin/equipos', icon: 'people-circle-outline' },
    { label: 'Usuarios', route: '/admin/usuarios', icon: 'person-circle-outline' },
    { label: 'Mapa ciudadano', route: '/mapa-incidencias', icon: 'map-outline' },
    { label: 'Vista ciudadana', route: '/home', icon: 'people-outline' },
  ];

  /** Las 6 categorías del backend con su etiqueta bonita para mostrar. */
  readonly categorias: CategoriaOption[] = [
    { value: 'infraestructura', label: 'Infraestructura' },
    { value: 'alumbrado', label: 'Alumbrado' },
    { value: 'residuos', label: 'Residuos' },
    { value: 'trafico', label: 'Tráfico' },
    { value: 'zonas_verdes', label: 'Zonas verdes' },
    { value: 'otro', label: 'Otro' },
  ];

  readonly equipos = signal<Equipo[]>([]);
  readonly incidencias = signal<Incidencia[]>([]);

  /** Formulario de creación de equipo. */
  newTeam: { nombre: string; categoria: Categoria } = {
    nombre: '',
    categoria: 'infraestructura',
  };

  /** Formulario de creación de trabajador para el equipo seleccionado. */
  newWorker: { nombre: string; puesto: string } = { nombre: '', puesto: '' };

  /** Borradores de edición del equipo seleccionado. */
  draftName = '';
  draftCategory: Categoria = 'infraestructura';

  readonly selectedTeam = computed<Equipo | null>(() => {
    const id = this.selectedTeamId();
    if (id === null) return null;
    return this.equipos().find((team) => team.id === id) ?? null;
  });

  readonly totalWorkers = computed(() =>
    this.equipos().reduce((acc, team) => acc + team.trabajadores.length, 0),
  );
  readonly availableWorkersCount = computed(() =>
    this.equipos().reduce(
      (acc, team) => acc + team.trabajadores.filter((w) => w.disponible).length,
      0,
    ),
  );

  ngOnInit(): void {
    this.loadTeams();
    this.loadIncidents();
  }

  loadTeams(): void {
    this.loading.set(true);
    this.error.set(null);
    this.equiposService.listarEquipos().subscribe({
      next: (equipos) => {
        this.equipos.set(equipos);
        // Mantener selección válida tras recargar.
        const current = this.selectedTeamId();
        if (current === null || !equipos.some((t) => t.id === current)) {
          this.selectTeam(equipos.length ? equipos[0].id : null);
        } else {
          this.syncDraftsFromSelection();
        }
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          this.messageFromError(err, 'No se pudieron cargar los equipos.'),
        );
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  loadIncidents(): void {
    this.incidentsLoading.set(true);
    this.incidentsError.set(null);
    this.incidenciasService.listar().subscribe({
      next: (page) => {
        this.incidencias.set(page.items);
        this.incidentsLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.incidentsError.set(
          'No se pudieron cargar las incidencias. Puedes gestionar equipos igualmente.',
        );
        this.incidentsLoading.set(false);
        this.cdr.markForCheck();
      },
    });
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

  selectTeam(teamId: number | null) {
    this.selectedTeamId.set(teamId);
    this.newWorker = { nombre: '', puesto: '' };
    this.syncDraftsFromSelection();
  }

  private syncDraftsFromSelection(): void {
    const team = this.selectedTeam();
    if (team) {
      this.draftName = team.nombre;
      this.draftCategory = team.categoria;
    } else {
      this.draftName = '';
      this.draftCategory = 'infraestructura';
    }
  }

  // ── CRUD de equipos ───────────────────────────────────────────────────────
  createTeam() {
    const nombre = this.newTeam.nombre.trim();
    if (!nombre) return;

    this.error.set(null);
    this.equiposService
      .crearEquipo({ nombre, categoria: this.newTeam.categoria })
      .subscribe({
        next: (team) => {
          this.newTeam = { nombre: '', categoria: 'infraestructura' };
          this.selectedTeamId.set(team.id);
          this.loadTeams();
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(
            this.messageFromError(err, 'No se pudo crear el equipo.'),
          );
          this.cdr.markForCheck();
        },
      });
  }

  saveTeam(teamId: number) {
    const nombre = this.draftName.trim();
    if (!nombre) return;

    this.error.set(null);
    this.equiposService
      .actualizarEquipo(teamId, { nombre, categoria: this.draftCategory })
      .subscribe({
        next: () => this.loadTeams(),
        error: (err: HttpErrorResponse) => {
          this.error.set(
            this.messageFromError(err, 'No se pudo actualizar el equipo.'),
          );
          this.cdr.markForCheck();
        },
      });
  }

  deleteTeam(teamId: number) {
    this.error.set(null);
    this.equiposService.eliminarEquipo(teamId).subscribe({
      next: () => {
        if (this.selectedTeamId() === teamId) this.selectedTeamId.set(null);
        this.loadTeams();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          this.messageFromError(err, 'No se pudo eliminar el equipo.'),
        );
        this.cdr.markForCheck();
      },
    });
  }

  // ── Gestión de trabajadores ───────────────────────────────────────────────
  addWorker() {
    const team = this.selectedTeam();
    if (!team) return;
    const nombre = this.newWorker.nombre.trim();
    if (!nombre) return;
    const puesto = this.newWorker.puesto.trim();

    this.error.set(null);
    this.equiposService
      .crearTrabajador(team.id, { nombre, puesto: puesto || null })
      .subscribe({
        next: () => {
          this.newWorker = { nombre: '', puesto: '' };
          this.loadTeams();
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(
            this.messageFromError(err, 'No se pudo añadir el trabajador.'),
          );
          this.cdr.markForCheck();
        },
      });
  }

  removeWorker(teamId: number, trabajadorId: number) {
    this.error.set(null);
    this.equiposService.quitarTrabajador(teamId, trabajadorId).subscribe({
      next: () => this.loadTeams(),
      error: (err: HttpErrorResponse) => {
        this.error.set(
          this.messageFromError(err, 'No se pudo quitar el trabajador.'),
        );
        this.cdr.markForCheck();
      },
    });
  }

  // ── Asignación de equipo a incidencia ─────────────────────────────────────
  /** Equipos elegibles para una incidencia: misma categoría. */
  eligibleTeams(incident: Incidencia): Equipo[] {
    return this.equipos().filter((team) => team.categoria === incident.categoria);
  }

  assignTeam(incident: Incidencia, equipoId: number | null) {
    this.assignError.set(null);
    this.assignSuccess.set(null);
    this.equiposService
      .asignarEquipoAIncidencia(incident.id, equipoId)
      .subscribe({
        next: () => {
          this.assignSuccess.set(
            equipoId === null
              ? `Equipo desasignado de la incidencia #${incident.id}.`
              : `Equipo asignado a la incidencia #${incident.id}.`,
          );
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 409) {
            this.assignError.set(
              `Categoría incompatible: el equipo no coincide con la categoría de la incidencia #${incident.id}.`,
            );
          } else if (err.status === 404) {
            this.assignError.set(
              `No se encontró la incidencia o el equipo (#${incident.id}).`,
            );
          } else {
            this.assignError.set(
              this.messageFromError(err, 'No se pudo asignar el equipo.'),
            );
          }
          this.cdr.markForCheck();
        },
      });
  }

  // ── Helpers de presentación ───────────────────────────────────────────────
  categoryLabel(categoria: Categoria | string): string {
    return (
      this.categorias.find((c) => c.value === categoria)?.label ??
      String(categoria)
    );
  }

  /**
   * Extrae un mensaje legible del error del backend.
   * FastAPI suele devolver `{ detail: '…' }` (string) en los 4xx.
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

  trackByTeamId = (_index: number, item: Equipo) => item.id;
  trackByWorkerId = (_index: number, item: { id: number }) => item.id;
  trackByIncidentId = (_index: number, item: Incidencia) => item.id;
  trackByMenuLabel = (_index: number, item: AdminMenuItem) => item.label;
  trackByCategory = (_index: number, item: CategoriaOption) => item.value;
}

export default EquiposManagementPage;
