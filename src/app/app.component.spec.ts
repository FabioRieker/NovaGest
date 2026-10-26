import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { AuthService } from './core/services/auth.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), AuthService]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should initialize with default public navigation when not logged in', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    const visible = app.visiblePages();
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.some(p => p.url === '/login')).toBe(true);
    expect(visible.some(p => p.url === '/help')).toBe(true);
  });

  it('should toggle theme correctly', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const initialMode = app.isDarkMode;
    app.toggleTheme({ detail: { checked: !initialMode } });
    expect(app.isDarkMode).toBe(!initialMode);
  });
});
