import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TarjetaPlato } from './tarjeta-plato';

describe('TarjetaPlato', () => {
  let component: TarjetaPlato;
  let fixture: ComponentFixture<TarjetaPlato>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TarjetaPlato],
    }).compileComponents();

    fixture = TestBed.createComponent(TarjetaPlato);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
