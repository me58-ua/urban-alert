import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppMenuComponent } from '../shared/app-menu/app-menu.component';

type Priority = 'Baja' | 'Media' | 'Alta';

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

  step = 1;

  incidentType = '';
  priority: Priority = 'Media';
  description = '';
  photos: string[] = [];
  address = '';

  readonly incidentTypes = [
    'Alumbrado',
    'Basura',
    'Baches',
    'Vandalismo',
    'Mobiliario urbano',
  ];

  goTo(stepNum: number) {
    this.step = stepNum;
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
    this.incidentType = '';
    this.priority = 'Media';
    this.description = '';
    this.photos = [];
    this.address = '';
    alert('Tu reporte se ha enviado correctamente.');
  }
}

export default CrearIncidenciaPage;
