import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppMenuComponent } from '../shared/app-menu/app-menu.component';

type Priority = 'Baja' | 'Media' | 'Alta';

interface IncidentType {
  label: string;
  icon: string;
}

@Component({
  selector: 'app-crear-incidencia',
  templateUrl: 'crear-incidencia.page.html',
  styleUrls: ['crear-incidencia.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, AppMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrearIncidenciaPage {
  readonly brandMarkUrl = 'https://www.figma.com/api/mcp/asset/ea43d037-46dd-44c0-84b7-fd6abad3b3d7';
  readonly mapUrl: SafeResourceUrl;

  constructor(private readonly sanitizer: DomSanitizer) {
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.openstreetmap.org/export/embed.html?bbox=-3.7105%2C40.4128%2C-3.6971%2C40.4214&layer=mapnik&marker=40.4168%2C-3.7038'
    );
  }

  step = 1;

  incidentType = 'Alumbrado';
  priority: Priority = 'Media';
  description = '';
  photos: string[] = [];
  address = '';

  readonly incidentTypes: IncidentType[] = [
    { label: 'Alumbrado', icon: 'bulb-outline' },
    { label: 'Basura', icon: 'trash-outline' },
    { label: 'Baches', icon: 'construct-outline' },
    { label: 'Vandalismo', icon: 'alert-circle-outline' },
    { label: 'Mobiliario', icon: 'business-outline' },
  ];

  readonly priorities: Priority[] = ['Baja', 'Media', 'Alta'];

  goTo(stepNum: number) {
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
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') this.photos = [...this.photos, reader.result];
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removePhoto(index: number) {
    this.photos = this.photos.filter((_, i) => i !== index);
  }

  next() {
    if (this.step < 2) this.step += 1;
  }

  prev() {
    if (this.step > 1) this.step -= 1;
  }

  submit() {
    console.log('Reporte enviado', {
      incidentType: this.incidentType,
      priority: this.priority,
      description: this.description,
      photos: this.photos.length,
      address: this.address,
    });
    this.step = 1;
    this.incidentType = 'Alumbrado';
    this.priority = 'Media';
    this.description = '';
    this.photos = [];
    this.address = '';
    alert('Tu reporte se ha enviado correctamente.');
  }

  trackByLabel = (_index: number, item: { label: string }) => item.label;
  trackByValue = (_index: number, item: string) => item;
}

export default CrearIncidenciaPage;
