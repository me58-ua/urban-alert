import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  alertCircleOutline,
  arrowForwardOutline,
  bulbOutline,
  businessOutline,
  cameraOutline,
  chatbubbleEllipsesOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  chevronForwardOutline,
  closeOutline,
  constructOutline,
  createOutline,
  documentTextOutline,
  folderOpenOutline,
  gridOutline,
  imageOutline,
  informationCircleOutline,
  locateOutline,
  locationOutline,
  lockClosedOutline,
  mapOutline,
  menuOutline,
  peopleCircleOutline,
  peopleOutline,
  personAddOutline,
  personCircleOutline,
  radioOutline,
  shieldCheckmarkOutline,
  statsChartOutline,
  trashOutline,
} from 'ionicons/icons';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

addIcons({
  addCircleOutline,
  alertCircleOutline,
  arrowForwardOutline,
  bulbOutline,
  businessOutline,
  cameraOutline,
  chatbubbleEllipsesOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  chevronForwardOutline,
  closeOutline,
  constructOutline,
  createOutline,
  documentTextOutline,
  folderOpenOutline,
  gridOutline,
  imageOutline,
  informationCircleOutline,
  locateOutline,
  locationOutline,
  lockClosedOutline,
  mapOutline,
  menuOutline,
  peopleCircleOutline,
  peopleOutline,
  personAddOutline,
  personCircleOutline,
  radioOutline,
  shieldCheckmarkOutline,
  statsChartOutline,
  trashOutline,
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(),
  ],
});
