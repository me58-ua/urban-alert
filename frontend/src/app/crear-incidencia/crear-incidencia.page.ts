import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HeaderComponent } from '../shared/header/header.component';
import { FooterComponent } from '../shared/footer/footer.component';
import { UiButtonComponent } from '../shared/ui-button/ui-button.component';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Categoria, IncidenciaCreate, IncidenciasService, Prioridad } from '../services/incidencias.service';

type Priority = 'Baja' | 'Media' | 'Alta';

interface IncidentType {
  label: string;
  icon: string;
}

/**
 * Ubicación por defecto cuando el navegador no concede geolocalización.
 * El mapa de incidencias ya no aplica geofiltro, así que lo creado aquí será
 * visible con independencia de estas coordenadas. Campus UA (Alicante).
 */
const FALLBACK_LOCATION = { lat: 38.3852, lng: -0.5132 } as const;

@Component({
  selector: 'app-crear-incidencia',
  templateUrl: 'crear-incidencia.page.html',
  styleUrls: ['crear-incidencia.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule, HeaderComponent, FooterComponent, UiButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrearIncidenciaPage {
  private readonly incidencias = inject(IncidenciasService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly mapUrl: SafeResourceUrl;

  constructor(private readonly sanitizer: DomSanitizer) {
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.openstreetmap.org/export/embed.html?bbox=-3.7105%2C40.4128%2C-3.6971%2C40.4214&layer=mapnik&marker=40.4168%2C-3.7038'
    );
  }

  step = 1;
  submitting = false;

  incidentType = 'Alumbrado';
  priority: Priority = 'Media';
  description = '';
  photos: string[] = [];
  photoFiles: File[] = [];
  address = '';

  readonly incidentTypes: IncidentType[] = [
    { label: 'Alumbrado', icon: 'bulb-outline' },
    { label: 'Basura', icon: 'trash-outline' },
    { label: 'Baches', icon: 'construct-outline' },
    { label: 'Vandalismo', icon: 'alert-circle-outline' },
    { label: 'Mobiliario', icon: 'business-outline' },
    { label: 'Trafico', icon: 'map-outline' },
    { label: 'Zonas verdes', icon: 'location-outline' },
  ];

  readonly priorities: Priority[] = ['Baja', 'Media', 'Alta'];

  // Mapea las etiquetas de la UI a las categorías del backend (enum CategoriaEnum).
  private readonly categoriaMap: Record<string, Categoria> = {
    Alumbrado: 'alumbrado',
    Basura: 'residuos',
    Baches: 'infraestructura',
    Vandalismo: 'otro',
    Mobiliario: 'infraestructura',
    Trafico: 'trafico',
    'Zonas verdes': 'zonas_verdes',
  };

  /**
   * El paso 1 ("Detalles") se considera completo cuando la descripción tiene
   * texto (el tipo y la prioridad siempre vienen preseleccionados y las fotos
   * son opcionales).
   */
  get step1Complete(): boolean {
    return !!this.description?.trim();
  }

  goTo(stepNum: number) {
    if (stepNum === 2 && !this.step1Complete) return;
    this.step = stepNum;
  }

  selectIncidentType(type: string) {
    this.incidentType = type;
  }

  selectPriority(priority: Priority) {
    this.priority = priority;
  }

  addPhoto(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.photoFiles = [...this.photoFiles, file];
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.photos = [...this.photos, reader.result];
        this.cdr.markForCheck();
      }
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removePhoto(index: number) {
    this.photos = this.photos.filter((_, i) => i !== index);
    this.photoFiles = this.photoFiles.filter((_, i) => i !== index);
  }

  next() {
    if (!this.step1Complete) return;
    if (this.step < 2) this.step += 1;
  }

  prev() {
    if (this.step > 1) this.step -= 1;
  }

  async submit() {
    // Defensa: si la sesión expiró mientras se rellenaba el formulario, no se
    // intenta crear nada sin autenticación; se redirige al login.
    if (!this.auth.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return;
    }
    if (!this.incidentType) {
      alert('Selecciona el tipo de incidencia antes de enviar.');
      return;
    }
    if (this.submitting) return;
    this.submitting = true;

    try {
      const { lat, lng } = await this.resolverUbicacion();

      const descripcion =
        [this.description?.trim(), this.address?.trim() ? `Dirección: ${this.address.trim()}` : '']
          .filter(Boolean)
          .join('\n') || null;

      const payload: IncidenciaCreate = {
        titulo: this.incidentType,
        descripcion,
        categoria: this.categoriaMap[this.incidentType] ?? 'otro',
        prioridad: this.priority.toLowerCase() as Prioridad,
        latitud: lat,
        longitud: lng,
      };

      const creada = await firstValueFrom(this.incidencias.crear(payload));

      // Subida de fotos: best-effort, no bloquea el éxito del reporte.
      for (const file of this.photoFiles) {
        try {
          await firstValueFrom(this.incidencias.subirImagen(creada.id, file));
        } catch {
          /* ignoramos fallos puntuales de subida de imagen */
        }
      }

      this.resetForm();
      alert(`Tu reporte #${creada.id} se ha enviado correctamente.`);
    } catch (err: unknown) {
      alert(`No se pudo enviar el reporte: ${this.extraerError(err)}`);
    } finally {
      this.submitting = false;
      this.cdr.markForCheck();
    }
  }

  /** Obtiene la ubicación por GPS; si se deniega o no está disponible usa un fallback. */
  private resolverUbicacion(): Promise<{ lat: number; lng: number }> {
    const fallback = { lat: FALLBACK_LOCATION.lat, lng: FALLBACK_LOCATION.lng };
    if (!('geolocation' in navigator)) return Promise.resolve(fallback);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(fallback),
        { timeout: 5000 },
      );
    });
  }

  private extraerError(err: unknown): string {
    const e = err as { error?: { detail?: unknown }; message?: string };
    const detail = e?.error?.detail ?? e?.message ?? 'Error desconocido';
    return typeof detail === 'string' ? detail : JSON.stringify(detail);
  }

  private resetForm() {
    this.step = 1;
    this.incidentType = 'Alumbrado';
    this.priority = 'Media';
    this.description = '';
    this.photos = [];
    this.photoFiles = [];
    this.address = '';
  }

  trackByLabel = (_index: number, item: { label: string }) => item.label;
  trackByValue = (_index: number, item: string) => item;
}

export default CrearIncidenciaPage;
