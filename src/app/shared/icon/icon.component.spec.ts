import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';

describe('IconComponent', () => {
  let fixture: ComponentFixture<IconComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [IconComponent] });
    fixture = TestBed.createComponent(IconComponent);
  });

  it('renderiza el path y las clases del icono solicitado', () => {
    fixture.componentRef.setInput('name', 'check');
    fixture.componentRef.setInput('size', 'lg');
    fixture.componentRef.setInput('colorClass', 'text-white');
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    const path = svg.querySelector('path') as SVGPathElement;

    expect(path.getAttribute('d')).toContain('m4.5 12.75');
    expect(svg.getAttribute('class')).toContain('h-6');
    expect(svg.getAttribute('class')).toContain('text-white');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('usa un tamaño por defecto seguro', () => {
    fixture.componentRef.setInput('name', 'eye');
    fixture.componentRef.setInput('size', 'invalido' as never);
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('class')).toContain('h-4');
  });

  it('expone el icono a lectores de pantalla cuando se solicita', () => {
    fixture.componentRef.setInput('name', 'book-open');
    fixture.componentRef.setInput('screenReader', true);
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg.hasAttribute('aria-hidden')).toBe(false);
  });

  it('no rompe con nombres desconocidos', () => {
    fixture.componentRef.setInput('name', 'no-existe');
    fixture.detectChanges();

    const path = fixture.nativeElement.querySelector('path') as SVGPathElement;
    expect(path.getAttribute('d')).toBe('');
  });
});
