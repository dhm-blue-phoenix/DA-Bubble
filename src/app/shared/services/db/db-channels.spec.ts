import { TestBed } from '@angular/core/testing';
import { DatabaseChannels } from './db-channels';
import { Supabase } from './db-superbase';
import { PLATFORM_ID } from '@angular/core';

describe('DatabaseChannels', () => {
  let service: DatabaseChannels;
  let registeredCallbacks: { table: string; callback: Function }[];
  let mockChannelInstance: any;
  let mockSupabaseClient: any;
  let channelsChain: any;
  let channelMembersChain: any;
  let defaultChain: any;
  let mockSupabaseService: any;

  const DEBUG_TEST_FLOW = true; // Set to true to monitor mocked database queries and realtime events

  function createMockChain(tableName: string, resolvedValue: any) {
    let queryActions: any[] = [];

    const logCall = (method: string, args: any[]) => {
      queryActions.push({ method, args });
    };

    const chain: any = {
      select: vi.fn().mockImplementation((...args) => { logCall('select', args); return chain; }),
      update: vi.fn().mockImplementation((...args) => { logCall('update', args); return chain; }),
      insert: vi.fn().mockImplementation((...args) => { logCall('insert', args); return chain; }),
      delete: vi.fn().mockImplementation((...args) => { logCall('delete', args); return chain; }),
      eq: vi.fn().mockImplementation((...args) => { logCall('eq', args); return chain; }),
      then: vi.fn().mockImplementation((onfulfilled: any) => {
        if (DEBUG_TEST_FLOW) {
          console.log(`[Supabase Query][${tableName}] Executed:`, {
            table: tableName,
            query: queryActions,
            resolvesWith: resolvedValue
          });
        }
        queryActions = [];
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

    channelsChain = createMockChain('channels', { data: [], error: null });
    channelMembersChain = createMockChain('channel_members', { data: [], error: null });
    defaultChain = createMockChain('default', { data: null, error: null });

    mockSupabaseClient = {
      channel: vi.fn().mockReturnValue(mockChannelInstance),
      removeChannel: vi.fn(),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'channels') return channelsChain;
        if (table === 'channel_members') return channelMembersChain;
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
          DatabaseChannels,
          { provide: Supabase, useValue: mockSupabaseService },
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      });
      service = TestBed.inject(DatabaseChannels);
    });

    it('should be created and subscribe to realtime channels and channel_members', () => {
      expect(service).toBeTruthy();
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('realtime:channels');
      expect(mockChannelInstance.on).toHaveBeenCalledTimes(2);
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

      it('should handle CHANNELS INSERT', () => {
        service._channel.set({ id: 'chan_1', name: 'Old Name' });
        triggerEvent('channels', {
          table: 'channels',
          eventType: 'INSERT',
          new: { id: 'chan_1', name: 'New Name', description: 'Desc' },
        });
        expect(service._channel()).toEqual(expect.objectContaining({ name: 'New Name', description: 'Desc' }));
      });

      it('should handle CHANNELS UPDATE', () => {
        service._channels.set([{ id: 'chan_1', name: 'Old Name' }]);
        service._channel.set({ id: 'chan_1', name: 'Old Name' });

        triggerEvent('channels', {
          table: 'channels',
          eventType: 'UPDATE',
          new: { id: 'chan_1', name: 'Updated Name' },
        });

        expect(service._channel()).toEqual(expect.objectContaining({ name: 'Updated Name' }));
        expect(service._channels()).toContainEqual({ id: 'chan_1', name: 'Updated Name' });
      });

      it('should handle MEMBERS INSERT', () => {
        service._channel.set({ id: 'chan_1', channel_members: [{ user_id: 'user_1' }] });

        triggerEvent('channel_members', {
          table: 'channel_members',
          eventType: 'INSERT',
          new: { channel_id: 'chan_1', user_id: 'user_2' },
        });

        const currentChannel = service._channel() as any;
        expect(currentChannel.channel_members).toContainEqual({ user_id: 'user_2' });
      });

      it('should handle MEMBERS DELETE', () => {
        service._channel.set({ id: 'chan_1', channel_members: [{ user_id: 'user_1' }, { user_id: 'user_2' }] });

        triggerEvent('channel_members', {
          table: 'channel_members',
          eventType: 'DELETE',
          old: { channel_id: 'chan_1', user_id: 'user_1' },
        });

        const currentChannel = service._channel() as any;
        expect(currentChannel.channel_members).not.toContainEqual({ user_id: 'user_1' });
        expect(currentChannel.channel_members).toContainEqual({ user_id: 'user_2' });
      });
    });

    describe('database query operations', () => {
      it('should get channel ids for a user', async () => {
        channelMembersChain.then.mockImplementation((onfulfilled: any) =>
          Promise.resolve({
            data: [
              { channel_id: 'chan_1', channels: { name: 'General' } },
            ],
            error: null,
          }).then(onfulfilled)
        );

        await service.getChannelIds('user_1');

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('channel_members');
        expect(channelMembersChain.select).toHaveBeenCalledWith('channel_id, channels(name)');
        expect(channelMembersChain.eq).toHaveBeenCalledWith('user_id', 'user_1');
        expect(service._channels()).toEqual([{ id: 'chan_1', name: 'General' }]);
      });

      it('should get channel data', async () => {
        channelsChain.then.mockImplementation((onfulfilled: any) =>
          Promise.resolve({
            data: [{ id: 'chan_1', name: 'General', channel_members: [{ user_id: 'user_1' }] }],
            error: null,
          }).then(onfulfilled)
        );

        await service.getChannelData('chan_1');

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('channels');
        expect(channelsChain.select).toHaveBeenCalledWith('id, name, description, created_by, channel_members(user_id)');
        expect(channelsChain.eq).toHaveBeenCalledWith('id', 'chan_1');
        expect(service._channel()).toEqual({ id: 'chan_1', name: 'General', channel_members: [{ user_id: 'user_1' }] });
      });

      it('should not create a channel if duplicate name exists', async () => {
        channelsChain.then.mockImplementation((onfulfilled: any) =>
          Promise.resolve({
            data: [{ name: 'General' }],
            error: null,
          }).then(onfulfilled)
        );

        const result = await service.createNewChannel('user_1', 'General', 'desc');

        expect(channelsChain.select).toHaveBeenCalledWith('name');
        expect(channelsChain.eq).toHaveBeenCalledWith('name', 'General');
        expect(result).toBe(false);
      });

      it('should create a new channel and member if no duplicate', async () => {
        let callCount = 0;
        channelsChain.then.mockImplementation((onfulfilled: any) => {
          callCount++;
          if (callCount === 1) {
            // duplicate check returns empty
            return Promise.resolve({ data: [], error: null }).then(onfulfilled);
          } else {
            // insert returns channel
            return Promise.resolve({ data: [{ id: 'new_chan' }], error: null }).then(onfulfilled);
          }
        });

        await service.createNewChannel('user_1', 'NewChannel', 'desc');

        expect(channelsChain.insert).toHaveBeenCalledWith({
          name: 'NewChannel',
          description: 'desc',
          created_by: 'user_1',
        });

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('channel_members');
        expect(channelMembersChain.insert).toHaveBeenCalledWith({
          channel_id: 'new_chan',
          user_id: 'user_1',
          role: 'admin',
        });
      });

      it('should create a new member', async () => {
        channelMembersChain.then.mockImplementation((onfulfilled: any) =>
          Promise.resolve({ data: [], error: null }).then(onfulfilled)
        );

        await service.createNewMember('chan_1', 'user_2', 'member');

        expect(channelMembersChain.insert).toHaveBeenCalledWith({
          channel_id: 'chan_1',
          user_id: 'user_2',
          role: 'member',
        });
      });

      it('should remove a member', async () => {
        channelMembersChain.then.mockImplementation((onfulfilled: any) =>
          Promise.resolve({ data: null, error: null }).then(onfulfilled)
        );

        await service.removeMember('chan_1', 'user_2');

        expect(channelMembersChain.delete).toHaveBeenCalled();
        expect(channelMembersChain.eq).toHaveBeenCalledWith('channel_id', 'chan_1');
        expect(channelMembersChain.eq).toHaveBeenCalledWith('user_id', 'user_2');
      });

      it('should update channel data', async () => {
        channelsChain.then.mockImplementation((onfulfilled: any) =>
          Promise.resolve({ data: null, error: null }).then(onfulfilled)
        );

        await service.updateChannelData('chan_1', 'UpdatedName', 'UpdatedDesc');

        expect(channelsChain.update).toHaveBeenCalledWith(expect.objectContaining({
          name: 'UpdatedName',
          description: 'UpdatedDesc',
        }));
        expect(channelsChain.eq).toHaveBeenCalledWith('id', 'chan_1');
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
          DatabaseChannels,
          { provide: Supabase, useValue: mockSupabaseService },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      service = TestBed.inject(DatabaseChannels);
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
