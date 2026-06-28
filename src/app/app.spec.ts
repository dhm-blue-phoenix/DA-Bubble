import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { Database } from './shared/services/db';
import { signal } from '@angular/core';

describe('App', () => {
  let mockDatabase: any;

  beforeEach(async () => {
    mockDatabase = {
      isLogin: signal(false),
      profiles: signal([]),
      messages: signal([]),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: Database, useValue: mockDatabase }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render congratulations message', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p')?.textContent).toContain('Congratulations! Your app is running.');
  });
});

