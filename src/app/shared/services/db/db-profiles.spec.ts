import { TestBed } from '@angular/core/testing';
import { DatabaseProfiles } from './db-profiles';
import { Supabase } from './db-superbase';
import { PLATFORM_ID } from '@angular/core';
import { Profile } from '../../interfaces/profile';

const DEBUG_TEST_FLOW = false; // Set to true to monitor mocked database queries and realtime events

describe('DatabaseProfiles', () => {
  let service: DatabaseProfiles;
  let registeredCallbacks: { table: string; callback: Function }[];
  let mockChannelInstance: any;
  let mockSupabaseClient: any;
  let profilesChain: any;
  let usersChain: any;
  let defaultChain: any;
  let mockSupabaseService: any;

  function createMockChain(tableName: string, resolvedValue: any) {
    const logCall = (method: string, args: any[]) => {
      if (DEBUG_TEST_FLOW) {
        console.log(`[Supabase Query][${tableName}] .${method}(${args.map(a => JSON.stringify(a)).join(', ')})`);
      }
    };

    const chain: any = {
      select: vi.fn().mockImplementation((...args) => { logCall('select', args); return chain; }),
      update: vi.fn().mockImplementation((...args) => { logCall('update', args); return chain; }),
      insert: vi.fn().mockImplementation((...args) => { logCall('insert', args); return chain; }),
      delete: vi.fn().mockImplementation((...args) => { logCall('delete', args); return chain; }),
      eq: vi.fn().mockImplementation((...args) => { logCall('eq', args); return chain; }),
      in: vi.fn().mockImplementation((...args) => { logCall('in', args); return chain; }),
      order: vi.fn().mockImplementation((...args) => { logCall('order', args); return chain; }),
      single: vi.fn().mockImplementation((...args) => { logCall('single', args); return chain; }),
      maybeSingle: vi.fn().mockImplementation((...args) => { logCall('maybeSingle', args); return chain; }),
      then: vi.fn().mockImplementation((onfulfilled: any) => {
        if (DEBUG_TEST_FLOW) console.log(`[Supabase Query][${tableName}] Resolving with:`, resolvedValue);
        return Promise.resolve(resolvedValue).then(onfulfilled);
      }),
    };
    return chain;
  }

  beforeEach(() => {
    registeredCallbacks = [];

    mockChannelInstance = {
      on: vi.fn().mockImplementation((event: string, filter: any, callback: Function) => {
        if (event === 'postgres_changes' && filter && filter.table) {
          registeredCallbacks.push({ table: filter.table, callback });
        }
        return mockChannelInstance;
      }),
      subscribe: vi.fn().mockImplementation(() => mockChannelInstance),
    };

    profilesChain = createMockChain('profiles', { data: [], error: null });
    usersChain = createMockChain('users', { data: [], error: null });
    defaultChain = createMockChain('default', { data: null, error: null });

    mockSupabaseClient = {
      channel: vi.fn().mockReturnValue(mockChannelInstance),
      removeChannel: vi.fn(),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') return profilesChain;
        return defaultChain;
      }),
    };

    mockSupabaseService = {
      supabase: mockSupabaseClient,
    };
  });

  describe('in Browser environment', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          DatabaseProfiles,
          { provide: Supabase, useValue: mockSupabaseService },
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      });
      service = TestBed.inject(DatabaseProfiles);
    });

    it('should be created and subscribe to profiles channel', () => {
      expect(service).toBeTruthy();
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('profiles');
      expect(mockChannelInstance.on).toHaveBeenCalledTimes(1);
      expect(mockChannelInstance.subscribe).toHaveBeenCalled();
    });

    describe('realtime events', () => {
      const triggerEvent = (table: string, payload: any) => {
        if (DEBUG_TEST_FLOW) {
          console.log(`[Realtime Event][${table}] Triggered event payload:`, payload);
        }
        const matches = registeredCallbacks.filter((c) => c.table === table);
        matches.forEach((m) => m.callback(payload));
      };

      it('should add profile on INSERT event if profile is not present', () => {
        const newProfile: Profile = {
          id: 'user_1',
          email: 'user1@example.com',
          name: 'User One',
          created_at: '2026-06-28T12:00:00Z',
          status: 'online',
          avatar_url: 'avatar1.png',
        };

        triggerEvent('profiles', {
          eventType: 'INSERT',
          new: newProfile,
        });

        expect(service._profiles()).toContainEqual(newProfile);
      });

      it('should not add duplicate profile on INSERT event if profile is already present', () => {
        const newProfile: Profile = {
          id: 'user_1',
          email: 'user1@example.com',
          name: 'User One',
          created_at: '2026-06-28T12:00:00Z',
          status: 'online',
          avatar_url: 'avatar1.png',
        };

        service._profiles.set([newProfile]);

        triggerEvent('profiles', {
          eventType: 'INSERT',
          new: newProfile,
        });

        expect(service._profiles().length).toBe(1);
      });

      it('should update profile on UPDATE event', () => {
        const oldProfile: Profile = {
          id: 'user_1',
          email: 'user1@example.com',
          name: 'User One',
          created_at: '2026-06-28T12:00:00Z',
          status: 'online',
          avatar_url: 'avatar1.png',
        };
        const updatedProfile: Profile = { ...oldProfile, name: 'User One Updated', status: 'away' };

        service._profiles.set([oldProfile]);

        triggerEvent('profiles', {
          eventType: 'UPDATE',
          new: updatedProfile,
        });

        expect(service._profiles()).toContainEqual(updatedProfile);
        expect(service._profiles().length).toBe(1);
      });
    });

    describe('database operations', () => {
      it('should fetch all profiles and update _profiles signal', async () => {
        const mockProfiles: Profile[] = [
          {
            id: 'user_1',
            email: 'user1@example.com',
            name: 'User One',
            created_at: '2026-06-28T12:00:00Z',
            status: 'online',
            avatar_url: 'avatar1.png',
          },
        ];

        profilesChain.then.mockImplementation((onfulfilled: any) =>
          Promise.resolve({ data: mockProfiles, error: null }).then(onfulfilled),
        );

        await service.getProfiles();

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
        expect(profilesChain.select).toHaveBeenCalledWith('id, name, email, avatar_url, status, created_at');
        expect(service._profiles()).toEqual(mockProfiles);
      });

      it('should fetch a single profile by ID', async () => {
        const mockProfile: Profile = {
          id: 'user_1',
          email: 'user1@example.com',
          name: 'User One',
          created_at: '2026-06-28T12:00:00Z',
          status: 'online',
          avatar_url: 'avatar1.png',
        };

        profilesChain.then.mockImplementation((onfulfilled: any) =>
          Promise.resolve({ data: [mockProfile], error: null }).then(onfulfilled),
        );

        const profile = await service.getProfile('user_1');

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
        expect(profilesChain.select).toHaveBeenCalledWith('id, name, email, avatar_url, status, created_at');
        expect(profilesChain.eq).toHaveBeenCalledWith('id', 'user_1');
        expect(profile).toEqual(mockProfile);
      });

      it('should return null if single profile fetch returns empty list', async () => {
        profilesChain.then.mockImplementation((onfulfilled: any) =>
          Promise.resolve({ data: [], error: null }).then(onfulfilled),
        );

        const profile = await service.getProfile('non_existent');

        expect(profile).toBeNull();
      });

      it('should update profile name if parameters are valid', async () => {
        profilesChain.then.mockImplementation((onfulfilled: any) =>
          Promise.resolve({ data: [], error: null }).then(onfulfilled),
        );

        // Valid name update
        await service.updateProfileName('user_123', 'New Name');

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
        expect(profilesChain.update).toHaveBeenCalledWith({ name: 'New Name' });
        expect(profilesChain.eq).toHaveBeenCalledWith('id', 'user_123');
      });

      it('should not update profile name if profileId is too short', async () => {
        await service.updateProfileName('123', 'New Name');
        expect(mockSupabaseClient.from).not.toHaveBeenCalled();
      });

      it('should not update profile name if name value is too short', async () => {
        await service.updateProfileName('user_123', 'A');
        expect(mockSupabaseClient.from).not.toHaveBeenCalled();
      });
    });

    describe('lifecycle methods', () => {
      it('should remove the channel on ngOnDestroy', () => {
        service.ngOnDestroy();
        expect(mockSupabaseClient.removeChannel).toHaveBeenCalledWith(mockChannelInstance);
      });
    });
  });

  describe('in Non-Browser environment', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          DatabaseProfiles,
          { provide: Supabase, useValue: mockSupabaseService },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      service = TestBed.inject(DatabaseProfiles);
    });

    it('should be created and not subscribe to channels', () => {
      expect(service).toBeTruthy();
      expect(mockSupabaseClient.channel).not.toHaveBeenCalled();
    });

    it('should not throw error on ngOnDestroy when channel is not defined', () => {
      expect(() => service.ngOnDestroy()).not.toThrow();
      expect(mockSupabaseClient.removeChannel).not.toHaveBeenCalled();
    });
  });
});
