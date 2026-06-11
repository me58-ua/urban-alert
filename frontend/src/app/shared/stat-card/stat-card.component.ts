import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

/** Tonos disponibles para la tarjeta (reutilizan los modificadores .metric-card--*). */
export type StatCardTone = 'blue' | 'amber' | 'green' | 'red';

/**
 * Tarjeta de métrica/cifra reutilizable (antes duplicada como `.metric-card`
 * en admin-dashboard, users-management y equipos-management, #T0).
 *
 * Se aplica como atributo sobre un `<article>` para que el elemento anfitrión
 * SEA la propia `.metric-card` y siga siendo hijo directo del grid contenedor
 * (`.metrics-grid` / `.users-summary` / `.teams-summary`). Así reutiliza sin
 * cambios los estilos globales de `.admin-page .metric-card*` y no rompe el
 * layout ni el aspecto. Ejemplo:
 *
 * ```html
 * <article appStatCard tone="blue" icon="people-outline"
 *          label="Usuarios totales" [value]="users().length"></article>
 * ```
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'article[appStatCard]',
  templateUrl: 'stat-card.component.html',
  standalone: true,
  imports: [IonicModule],
  host: {
    class: 'metric-card',
    '[class.metric-card--blue]': "tone === 'blue'",
    '[class.metric-card--amber]': "tone === 'amber'",
    '[class.metric-card--green]': "tone === 'green'",
    '[class.metric-card--red]': "tone === 'red'",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardComponent {
  /** Nombre del icono de Ionicons (p.ej. `people-outline`). */
  @Input() icon = '';
  /** Etiqueta descriptiva (p.ej. "Usuarios totales"). */
  @Input() label = '';
  /** Cifra principal a mostrar. */
  @Input() value: string | number = 0;
  /** Tono cromático de la tarjeta. */
  @Input() tone: StatCardTone = 'blue';
}

export default StatCardComponent;
