import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZonaPricipal } from './zona-pricipal';

describe('ZonaPricipal', () => {
  let component: ZonaPricipal;
  let fixture: ComponentFixture<ZonaPricipal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZonaPricipal],
    }).compileComponents();

    fixture = TestBed.createComponent(ZonaPricipal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
