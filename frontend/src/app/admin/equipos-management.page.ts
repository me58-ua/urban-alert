import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { catchError, map, of, startWith } from 'rxjs';
import { Categoria, Incidencia, IncidenciasService } from '../services/incidencias.service';

type OperationalCategory = 'Alumbrado' | 'Basura' | 'Baches' | 'Vandalismo' | 'Mobiliario';

interface AdminMenuItem {
  label: string;
  route: string;
  icon: string;
}

interface Worker {
  id: number;
  name: string;
  role: string;
  available: boolean;
}

interface Team {
  id: string;
  name: string;
  category: OperationalCategory;
  backendCategory: Categoria;
  workerIds: number[];
  assignedIncidentId?: number;
}

interface TeamsViewModel {
  incidents: Incidencia[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-equipos-management',
  templateUrl: 'equipos-management.page.html',
  styleUrls: ['equipos-management.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquiposManagementPage {
  private readonly incidencias = inject(IncidenciasService);

  readonly brandMarkUrl =
    'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';

  readonly isMenuOpen = signal(false);
  readonly popoverEvent = signal<Event | undefined>(undefined);
  readonly selectedTeamId = signal('EQ-102');

  readonly menuItems: AdminMenuItem[] = [
    { label: 'Dashboard', route: '/admin', icon: 'grid-outline' },
    { label: 'Equipos', route: '/admin/equipos', icon: 'people-circle-outline' },
    { label: 'Usuarios', route: '/admin/usuarios', icon: 'person-circle-outline' },
    { label: 'Mapa ciudadano', route: '/mapa-incidencias', icon: 'map-outline' },
    { label: 'Vista ciudadana', route: '/home', icon: 'people-outline' },
  ];

  readonly categories: OperationalCategory[] = ['Alumbrado', 'Basura', 'Baches', 'Vandalismo', 'Mobiliario'];

  readonly workers = signal<Worker[]>([
    { id: 1, name: 'Laura Martin', role: 'Electricista', available: true },
    { id: 2, name: 'Hugo Vidal', role: 'Operario limpieza', available: true },
    { id: 3, name: 'Nora Ruiz', role: 'Pavimentos', available: true },
    { id: 4, name: 'Diego Cano', role: 'Mantenimiento', available: false },
    { id: 5, name: 'Sara Molina', role: 'Jardineria urbana', available: true },
  ]);

  readonly teams = signal<Team[]>([
    { id: 'EQ-101', name: 'Luz Norte', category: 'Alumbrado', backendCategory: 'alumbrado', workerIds: [1] },
    { id: 'EQ-102', name: 'Calzada Rapida', category: 'Baches', backendCategory: 'infraestructura', workerIds: [3, 4] },
    { id: 'EQ-103', name: 'Limpieza Centro', category: 'Basura', backendCategory: 'residuos', workerIds: [2] },
    { id: 'EQ-104', name: 'Mobiliario Sur', category: 'Mobiliario', backendCategory: 'infraestructura', workerIds: [5] },
    { id: 'EQ-105', name: 'Intervencion Urbana', category: 'Vandalismo', backendCategory: 'otro', workerIds: [] },
  ]);

  readonly selectedTeam = computed((): Team => this.teams().find((team) => team.id === this.selectedTeamId()) ?? this.teams()[0]);
  readonly availableWorkersCount = computed(() => this.workers().filter((worker) => worker.available).length);

  readonly vm$ = this.incidencias.listar().pipe(
    map(({ items: incidents }): TeamsViewModel => ({ incidents, loading: false, error: null })),
    startWith({ incidents: [], loading: true, error: null }),
    catchError(() =>
      of({
        incidents: [],
        loading: false,
        error: 'No se pudieron cargar incidencias. Puedes gestionar equipos igualmente.',
      }),
    ),
  );

  openMenu(event: Event) {
    this.popoverEvent.set(event);
    this.isMenuOpen.set(true);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
    this.popoverEvent.set(undefined);
  }

  selectTeam(teamId: string) {
    this.selectedTeamId.set(teamId);
  }

  toggleWorker(workerId: number, checked: boolean) {
    const team = this.selectedTeam();
    if (!team) return;

    this.teams.update((teams) =>
      teams.map((item) => {
        if (item.id !== team.id) return item;
        const workerIds = checked
          ? Array.from(new Set([...item.workerIds, workerId]))
          : item.workerIds.filter((id) => id !== workerId);
        return { ...item, workerIds };
      }),
    );
  }

  updateTeamCategory(category: OperationalCategory) {
    const team = this.selectedTeam();
    if (!team) return;

    this.teams.update((teams) =>
      teams.map((item) =>
        item.id === team.id ? { ...item, category, backendCategory: this.categoryFromLabel(category) } : item,
      ),
    );
  }

  assignTeam(teamId: string, incidentId: number) {
    this.teams.update((teams) =>
      teams.map((team) => (team.id === teamId ? { ...team, assignedIncidentId: incidentId } : team)),
    );
  }

  eligibleTeams(incident: Incidencia): Team[] {
    const operationalCategory = this.incidentOperationalCategory(incident);
    return this.teams().filter((team) => {
      if (team.backendCategory !== incident.categoria) return false;
      if (operationalCategory && incident.categoria === 'infraestructura') {
        return team.category === operationalCategory;
      }
      return true;
    });
  }

  workerNames(team: Team): string {
    const names = this.workers()
      .filter((worker) => team.workerIds.includes(worker.id))
      .map((worker) => worker.name);
    return names.length ? names.join(', ') : 'Sin trabajadores asignados';
  }

  isWorkerInSelectedTeam(workerId: number): boolean {
    return this.selectedTeam()?.workerIds.includes(workerId) ?? false;
  }

  formatCategory(category: string): string {
    const labels: Record<string, string> = {
      alumbrado: 'Alumbrado',
      residuos: 'Basura',
      infraestructura: 'Infraestructura',
      otro: 'Vandalismo',
    };
    return labels[category] ?? category;
  }

  categoryFromLabel(category: OperationalCategory): Categoria {
    const categoriaMap: Record<OperationalCategory, Categoria> = {
      Alumbrado: 'alumbrado',
      Basura: 'residuos',
      Baches: 'infraestructura',
      Vandalismo: 'otro',
      Mobiliario: 'infraestructura',
    };
    return categoriaMap[category];
  }

  private incidentOperationalCategory(incident: Incidencia): OperationalCategory | null {
    const title = incident.titulo.toLowerCase();
    if (title.includes('bache')) return 'Baches';
    if (title.includes('mobiliario')) return 'Mobiliario';
    if (title.includes('alumbrado') || title.includes('farola')) return 'Alumbrado';
    if (title.includes('basura') || title.includes('residuo')) return 'Basura';
    if (title.includes('vandal')) return 'Vandalismo';
    return null;
  }

  trackByTeamId = (_index: number, item: Team) => item.id;
  trackByWorkerId = (_index: number, item: Worker) => item.id;
  trackByIncidentId = (_index: number, item: Incidencia) => item.id;
  trackByMenuLabel = (_index: number, item: AdminMenuItem) => item.label;
  trackByCategory = (_index: number, item: OperationalCategory) => item;
}

export default EquiposManagementPage;
