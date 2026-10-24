import { AfterViewInit, Directive, ElementRef, Renderer2, inject } from '@angular/core';

@Directive({ selector: 'button, option' })
export class CustomOptionAppearance implements AfterViewInit {
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  ngAfterViewInit(): void {
    const label = (this.element.nativeElement.textContent || '').trim();
    if (/^(?:dopsat|doplnit)\s+vlastn[íi](?:\s|$)/iu.test(label)) {
      this.renderer.addClass(this.element.nativeElement, 'custom-option-choice');
    }
  }
}
