import { AfterViewChecked, Directive, ElementRef, HostListener, inject } from '@angular/core';

@Directive({
  selector: 'textarea[appHandoverText]',
  host: { class: 'handover-text-field', rows: '1' }
})
export class HandoverTextareaDirective implements AfterViewChecked {
  private readonly element = inject<ElementRef<HTMLTextAreaElement>>(ElementRef).nativeElement;
  private lastValue: string | undefined;

  ngAfterViewChecked(): void {
    if (this.element.value !== this.lastValue) this.resize();
  }

  @HostListener('input') onInput(): void { this.resize(); }
  @HostListener('window:resize') onWindowResize(): void { this.resize(); }

  private resize(): void {
    const element = this.element;
    this.lastValue = element.value;
    const style = getComputedStyle(element);
    const border = (Number.parseFloat(style.borderTopWidth) || 0) + (Number.parseFloat(style.borderBottomWidth) || 0);
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight + border}px`;
  }
}
