import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

/** Variantes semánticas del botón de texto reutilizable. */
export type UiButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
/** Tamaños soportados (se mapean 1:1 sobre el `size` de `ion-button`). */
export type UiButtonSize = 'small' | 'default' | 'large';
/** Posición del icono respecto al texto. */
export type UiButtonIconSlot = 'start' | 'end';

/**
 * Botón de texto reutilizable (#T2). Unifica los botones ad-hoc duplicados por
 * toda la app (`.primary-action` navy, `.secondary-action` claro, acciones de
 * peligro, botones "clear"/"ghost"…) sobre un único `<ion-button>` por debajo.
 *
 * Aspecto: cada variante define sus valores por defecto vía las CSS custom
 * properties de Ionic (`--background`, `--color`, `--border-radius`…), usando
 * los tokens de marca `--ua-*`. Como esas variables se declaran en el `:host`
 * del componente y las propiedades CSS HEREDAN a través de la encapsulación
 * hasta el `ion-button` interno, una página puede seguir afinando el aspecto
 * exacto poniendo su clase propia (p.ej. `class="primary-action"`) en el
 * `<app-ui-button>`: esa regla vive en el template de la página, gana en
 * especificidad al `:host` y sus variables se heredan al botón. Así se mantiene
 * EXACTAMENTE el aspecto previo sin duplicar estilos.
 *
 * Comportamiento: se reexponen `type`, `disabled`, `routerLink`, `expand`,
 * `fill`, `size` y `color`; el `(click)` se enlaza directamente sobre
 * `<app-ui-button>` porque el evento de click nativo burbujea desde el botón.
 *
 * ```html
 * <app-ui-button variant="primary" expand="block" type="submit" [disabled]="loading">
 *   Entrar
 * </app-ui-button>
 *
 * <app-ui-button variant="primary" icon="map-outline" routerLink="/mapa-incidencias">
 *   Abrir mapa
 * </app-ui-button>
 * ```
 */
@Component({
  selector: 'app-ui-button',
  templateUrl: 'ui-button.component.html',
  styleUrls: ['ui-button.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ui-button--primary]': "variant === 'primary'",
    '[class.ui-button--secondary]': "variant === 'secondary'",
    '[class.ui-button--danger]': "variant === 'danger'",
    '[class.ui-button--ghost]': "variant === 'ghost'",
    '[class.ui-button--block]': "expand === 'block' || expand === 'full'",
  },
})
export class UiButtonComponent {
  /** Estilo semántico del botón. */
  @Input() variant: UiButtonVariant = 'primary';
  /** Tamaño del botón. `default` deja el tamaño nativo de Ionic. */
  @Input() size: UiButtonSize = 'default';
  /** Modo de expansión de Ionic (`block` ocupa el ancho disponible). */
  @Input() expand: 'block' | 'full' | null = null;
  /**
   * Relleno de Ionic. Si no se indica, cada variante usa su valor natural
   * (`solid` para primary/secondary/danger, `clear` para ghost).
   */
  @Input() fill: 'solid' | 'outline' | 'clear' | null = null;
  /** Nombre del icono de Ionicons opcional (p.ej. `map-outline`). */
  @Input() icon: string | null = null;
  /** Lado en el que se coloca el icono respecto al texto. */
  @Input() iconSlot: UiButtonIconSlot = 'start';
  /** Tipo del botón HTML subyacente. */
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  /** Deshabilita el botón. */
  @Input() disabled = false;
  /** Ruta de navegación opcional (Angular Router). */
  @Input() routerLink: string | unknown[] | null = null;
  /** Color de Ionic opcional (sobrescribe el de la variante si se pasa). */
  @Input() color: string | null = null;
  /** Etiqueta accesible opcional (útil si el contenido es solo un icono). */
  @Input() ariaLabel: string | null = null;

  /** `size` efectivo para `ion-button` (`default` => sin atributo). */
  get ionSize(): 'small' | 'default' | 'large' | undefined {
    return this.size === 'default' ? undefined : this.size;
  }

  /** `fill` efectivo: el explícito o el natural de la variante. */
  get ionFill(): 'solid' | 'outline' | 'clear' {
    if (this.fill) {
      return this.fill;
    }
    return this.variant === 'ghost' ? 'clear' : 'solid';
  }
}

export default UiButtonComponent;
