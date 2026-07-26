import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { DatabaseAuth } from './db-auth';
import { Supabase } from './db-superbase';
import { vi } from 'vitest';

describe('DatabaseAuth', () => {
  let service: DatabaseAuth;
  let mockSupabaseClient: any;
  let mockProfilesChain: any;

  beforeEach(() => {
    mockProfilesChain = {
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn(),
    };

    mockSupabaseClient = {
      from: vi.fn().mockReturnValue(mockProfilesChain),
      auth: {
        onAuthStateChange: vi.fn(),
        signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'user_1' } }, error: null }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'user_1' } }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
        resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        DatabaseAuth,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Supabase, useValue: { supabase: mockSupabaseClient } },
      ],
    });
  });

  describe('in Browser environment', () => {
    beforeEach(() => {
      vi.stubGlobal('window', {
        addEventListener: vi.fn(),
        location: { reload: vi.fn(), origin: 'http://localhost:4200' },
      });
      service = TestBed.inject(DatabaseAuth);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should be created and set up focus listeners', () => {
      expect(service).toBeTruthy();
      expect(window.addEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
    });

    it('should return empty string if no user is signed in', () => {
      expect(service.getCurrentUserId()).toBe('');
    });

    it('should check if email exists and return true when present', async () => {
      mockProfilesChain.limit.mockResolvedValueOnce({ data: [{ id: 'some_id' }] });
      const exists = await service.checkEmailExists('test@test.com');
      expect(exists).toBe(true);
    });

    it('should check if email exists and return false when absent', async () => {
      mockProfilesChain.limit.mockResolvedValueOnce({ data: [] });
      const notExists = await service.checkEmailExists('new@test.com');
      expect(notExists).toBe(false);
    });

    it('should signUpNewUser if email does not exist', async () => {
      mockProfilesChain.limit.mockResolvedValueOnce({ data: [] });
      await service.signUpNewUser('new@test.com', 'password123', 'New User', 'avatar.png');
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'new@test.com',
        password: 'password123',
        options: { data: { name: 'New User', avatar: 'avatar.png' } },
      });
    });

    it('should not signUpNewUser if email exists', async () => {
      mockProfilesChain.limit.mockResolvedValueOnce({ data: [{ id: 'existing' }] });
      await service.signUpNewUser('existing@test.com', 'password123', 'Existing User', 'avatar.png');
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });

    it('should signInWithEmail successfully', async () => {
      await service.signInWithEmail('test@test.com', 'password123');
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
      });
    });

    it('should signOut and set status to offline before signing out', async () => {
      service['currentUserId'] = 'user_1';
      await service.signOut();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
      expect(mockProfilesChain.update).toHaveBeenCalledWith({ status: 'offline' });
      expect(mockProfilesChain.eq).toHaveBeenCalledWith('id', 'user_1');
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });

    it('should set currentUserId and isUserLogin on eventHelperMainSetup', async () => {
      const mockSession: any = { user: { id: 'user_1' } };
      await service.eventHelperMainSetup(mockSession);
      expect(service.getCurrentUserId()).toBe('user_1');
      expect(service._isUserLogin()).toBe(true);
    });

    it('should clear userId and isUserLogin on eventHelperSignedOut', async () => {
      service['currentUserId'] = 'user_1';
      service._isUserLogin.set(true);
      await service.eventHelperSignedOut();
      expect(service.getCurrentUserId()).toBe('');
      expect(service._isUserLogin()).toBe(false);
    });

    it('should call resetPasswordForEmail', async () => {
      await service.resetPasswordForEmail('test@test.com');
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@test.com', {
        redirectTo: 'http://localhost:4200/reset-password',
      });
    });

    it('should changePassword', async () => {
      await service.changePassword('newpass');
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({ password: 'newpass' });
    });
  });

  describe('in Server environment', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          DatabaseAuth,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: Supabase, useValue: { supabase: mockSupabaseClient } },
        ],
      });
      service = TestBed.inject(DatabaseAuth);
    });

    it('should not setup listeners on server', () => {
      expect(mockSupabaseClient.auth.onAuthStateChange).not.toHaveBeenCalled();
    });
  });
});
