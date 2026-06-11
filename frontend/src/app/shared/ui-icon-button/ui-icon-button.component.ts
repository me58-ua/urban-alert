import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

/** Variantes del botón de solo icono. */
export type UiIconButtonVariant = 'default' | 'danger' | 'success';

/**
 * Botón de SOLO icono para acciones de tabla/lista admin (#T2): editar,
 * eliminar, guardar, cancelar… Unifica los antiguos `.icon-action`,
 * `.icon-action--danger`, `.icon-action--save` y enlaces de icono ad-hoc
 * (`.danger-link`, `.icon-link`) en un control accesible con `aria-label`
 * obligatorio.
 *
 * Renderiza un `<button type="button">` nativo (no `ion-button`) para conservar
 * exactamente el aspecto de los antiguos botones cuadrados de 2.2rem con fondo
 * suave; sus colores salen de los tokens `--ua-*`. El `(click)` se enlaza sobre
 * `<app-ui-icon-button>` porque el click nativo burbujea.
 *
 * ```html
 * <app-ui-icon-button icon="create-outline" ariaLabel="Editar" (click)="edit()" />
 * <app-ui-icon-button variant="danger" icon="trash-outline" ariaLabel="Eliminar" (click)="remove()" />
 * <app-ui-icon-button variant="success" icon="checkmark-outline" ariaLabel="Guardar" (click)="save()" />
 * ```
 */
@Component({
  selector: 'app-ui-icon-button',
  templateUrl: 'ui-icon-button.component.html',
  styleUrls: ['ui-icon-button.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiIconButtonComponent {
  /** Nombre del icono de Ionicons (p.ej. `trash-outline`). */
  @Input() icon = '';
  /** Variante cromática de la acción. */
  @Input() variant: UiIconButtonVariant = 'default';
  /** Etiqueta accesible (obligatoria: el botón no tiene texto visible). */
  @Input() ariaLabel = '';
  /** Tipo del botón nativo. */
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  /** Deshabilita el botón. */
  @Input() disabled = false;
}

export default UiIconButtonComponent;
