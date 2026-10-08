import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Comidas } from './comidas';

describe('Comidas', () => {
  let component: Comidas;
  let fixture: ComponentFixture<Comidas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Comidas],
    }).compileComponents();

    fixture = TestBed.createComponent(Comidas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
