import { TestBed } from '@angular/core/testing';

import { Db } from './db';

describe('Db', () => {
  let service: Db;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Db);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
