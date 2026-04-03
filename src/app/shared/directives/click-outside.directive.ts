import { Directive, ElementRef, EventEmitter, Output, inject, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Directive({
  selector: '[clickOutside]',
  standalone: true
})
export class ClickOutsideDirective implements OnInit, OnDestroy {
  @Output() clickOutside = new EventEmitter<void>();

  private elementRef = inject(ElementRef);
  private document = inject(DOCUMENT);
  private onClickHandler = this.onClick.bind(this);
  private emitTimeoutId: number | null = null;

  ngOnInit(): void {
    this.document.addEventListener('click', this.onClickHandler);
  }

  ngOnDestroy(): void {
    this.document.removeEventListener('click', this.onClickHandler);
    if (this.emitTimeoutId !== null) {
      clearTimeout(this.emitTimeoutId);
      this.emitTimeoutId = null;
    }
  }

  private onClick(event: MouseEvent): void {
    // Guard: if the directive was destroyed between listener registration and this callback
    // (rare but possible during rapid navigation), bail out safely.
    if (!this.elementRef?.nativeElement) return;

    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      // Use setTimeout to avoid immediate firing when clicking the trigger button.
      // The timeout ID is stored so ngOnDestroy can cancel it if the component is
      // destroyed before the callback fires.
      this.emitTimeoutId = window.setTimeout(() => {
        if (this.elementRef?.nativeElement) {
          this.clickOutside.emit();
        }
      }, 0);
    }
  }
}
