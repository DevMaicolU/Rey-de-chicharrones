import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TarjetaBebida } from './tarjeta-bebida';

describe('TarjetaBebida', () => {
  let component: TarjetaBebida;
  let fixture: ComponentFixture<TarjetaBebida>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TarjetaBebida],
    }).compileComponents();

    fixture = TestBed.createComponent(TarjetaBebida);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
