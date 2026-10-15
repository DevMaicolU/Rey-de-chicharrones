import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToastService, Toast } from '../servicios/toast.service';

@Component({
  selector: 'app-toast',
  imports: [AsyncPipe],
  template: `
    <div class="toast-container" aria-live="polite" aria-atomic="true">
      @for (toast of (toast$ | async) ?? []; track toast.id) {
        <div
          class="manila-toast manila-toast--{{ toast.tipo }}"
          role="alert"
          (click)="toastService.cerrar(toast.id)"
        >
          <span class="manila-toast__icon" aria-hidden="true">
            @switch (toast.tipo) {
              @case ('exito') { ✓ }
              @case ('error') { ✕ }
              @case ('advertencia') { ⚠ }
              @default { ℹ }
            }
          </span>
          <span class="manila-toast__msg">{{ toast.mensaje }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      max-width: 360px;
    }
    .manila-toast {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1.1rem;
      border-radius: 0.75rem;
      font-size: 0.88rem;
      font-weight: 500;
      color: #fff;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0,0,0,0.18);
      animation: toastIn 0.28s cubic-bezier(.21,1.02,.73,1) both;
      border-left: 4px solid rgba(255,255,255,0.35);
    }
    .manila-toast--exito   { background: #1a7a4a; }
    .manila-toast--error   { background: #c0392b; }
    .manila-toast--info    { background: #2563ab; }
    .manila-toast--advertencia { background: #b45309; }
    .manila-toast__icon {
      font-size: 1.05rem;
      font-weight: 700;
      flex-shrink: 0;
      width: 1.4rem;
      text-align: center;
    }
    .manila-toast__msg { line-height: 1.4; }
    @keyframes toastIn {
      from { transform: translateX(100%) scale(0.9); opacity: 0; }
      to   { transform: translateX(0)   scale(1);   opacity: 1; }
    }
  `]
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
  readonly toast$ = this.toastService.toasts$;
}
