import { Component, Input, ChangeDetectionStrategy, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ErrorService } from '../../../core/services/error.service';

@Component({
  selector: 'app-error-message',
  standalone: true,
  imports: [CommonModule, ToastModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p-toast></p-toast>`,
  styles: []
})
export class ErrorMessageComponent {
  @Input() onDismiss?: () => void;
  private errorService = inject(ErrorService);
  private messageService = inject(MessageService);

  constructor() {
    // Watch for errors and show error toast
    effect(() => {
      const error = this.errorService.error();
      if (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message,
          life: 5000
        });
        if (this.onDismiss) {
          this.onDismiss();
        } else {
          this.errorService.clearError();
        }
      }
    });

    // Watch for success events and show success toast
    effect(() => {
      const success = this.errorService.success();
      if (success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: success,
          life: 3000
        });
        this.errorService.clearSuccess();
      }
    });
  }
}
