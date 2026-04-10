import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [(visible)]="isOpen"
      [modal]="true"
      [style]="dialogStyle"
      [draggable]="false"
      [resizable]="false"
      appendTo="body"
      (onHide)="onClose()">
      <ng-template pTemplate="header">
        <span class="p-text-bold">{{ title }}</span>
      </ng-template>
      <ng-content></ng-content>
      <ng-template pTemplate="footer">
        <ng-content select="[footer]"></ng-content>
      </ng-template>
    </p-dialog>
  `,
  styles: []
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() showFooter = true;
  /** Override default dialog dimensions. Callers can pass e.g. {'max-width': '800px'} for wider forms. */
  @Input() dialogStyle: Record<string, string> = { width: '90vw', 'max-width': '500px' };
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.isOpen = false;
    this.close.emit();
  }
}
