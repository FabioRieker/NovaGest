import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should authenticate admin user with valid credentials', async () => {
    const user = await firstValueFrom(
      service.login({ email: 'admin@empresa.com', password: 'Admin1234*' })
    );
    expect(user).toBeTruthy();
    expect(user.role).toBe('admin');
    expect(service.isAdminSignal()).toBe(true);
    expect(service.isAuthenticatedSignal()).toBe(true);
    expect(service.getToken()).toBeTruthy();
  });

  it('should reject invalid credentials', async () => {
    await expect(
      firstValueFrom(service.login({ email: 'fake@empresa.com', password: 'wrong' }))
    ).rejects.toThrow();
    expect(service.isAuthenticatedSignal()).toBe(false);
  });

  it('should clear session upon logout', async () => {
    await firstValueFrom(
      service.login({ email: 'user@empresa.com', password: 'User1234*' })
    );
    expect(service.isAuthenticatedSignal()).toBe(true);
    service.logout();
    expect(service.isAuthenticatedSignal()).toBe(false);
    expect(service.getToken()).toBeNull();
  });
});
