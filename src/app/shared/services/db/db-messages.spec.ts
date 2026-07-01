import { TestBed } from '@angular/core/testing';
import { DatabaseMessages } from './db-messages';
import { Supabase } from './db-superbase';
import { PLATFORM_ID } from '@angular/core';
import { Message, Reaction } from '../../interfaces/messages';

describe('DatabaseMessages', () => {
  let service: DatabaseMessages;
  let registeredCallbacks: { table: string; callback: Function }[];
  let mockChannelInstance: any;
  let mockSupabaseClient: any;
  let messagesChain: any;
  let reactionsChain: any;
  let defaultChain: any;
  let mockSupabaseService: any;

  const DEBUG_TEST_FLOW = false; // Set to true to monitor mocked database queries and realtime events

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
      is: vi.fn().mockImplementation((...args) => { logCall('is', args); return chain; }),
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

    messagesChain = createMockChain('messages', { data: [], error: null });
    reactionsChain = createMockChain('reactions', { data: [], error: null });
    defaultChain = createMockChain('default', { data: null, error: null });

    mockSupabaseClient = {
      channel: vi.fn().mockReturnValue(mockChannelInstance),
      removeChannel: vi.fn(),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'messages') return messagesChain;
        if (table === 'reactions') return reactionsChain;
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
          DatabaseMessages,
          { provide: Supabase, useValue: mockSupabaseService },
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      });
      service = TestBed.inject(DatabaseMessages);
    });

    it('should be created and subscribe to messages and reactions channels', () => {
      expect(service).toBeTruthy();
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('custom-all-channel');
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

      it('should add message on INSERT if message is not present', () => {
        const newMsg: Message = {
          id: 'msg_1',
          sender_id: 'user_1',
          content: 'Hello World',
          reactions: [],
          channel_id: 'chan_1',
          chat_id: 'chat_1',
          thread_id: null,
          created_at: '2026-06-28T12:00:00Z',
          edited_at: null,
        };

        triggerEvent('messages', {
          table: 'messages',
          eventType: 'INSERT',
          new: newMsg,
        });

        expect(service._messages()).toContainEqual(newMsg);
      });

      it('should not add message on INSERT if message is already present', () => {
        const newMsg: Message = {
          id: 'msg_1',
          sender_id: 'user_1',
          content: 'Hello World',
          reactions: [],
          channel_id: 'chan_1',
          chat_id: 'chat_1',
          thread_id: null,
          created_at: '2026-06-28T12:00:00Z',
          edited_at: null,
        };

        service._messages.set([newMsg]);

        triggerEvent('messages', {
          table: 'messages',
          eventType: 'INSERT',
          new: newMsg,
        });

        expect(service._messages().length).toBe(1);
      });

      it('should update message on UPDATE', () => {
        const oldMsg: Message = {
          id: 'msg_1',
          sender_id: 'user_1',
          content: 'Hello World',
          reactions: [],
          channel_id: 'chan_1',
          chat_id: 'chat_1',
          thread_id: null,
          created_at: '2026-06-28T12:00:00Z',
          edited_at: null,
        };
        const updatedMsg: Message = { ...oldMsg, content: 'Updated Hello World', edited_at: '2026-06-28T12:05:00Z' };

        service._messages.set([oldMsg]);

        triggerEvent('messages', {
          table: 'messages',
          eventType: 'UPDATE',
          new: updatedMsg,
        });

        expect(service._messages()).toContainEqual(updatedMsg);
        expect(service._messages().length).toBe(1);
      });

      it('should add reaction on INSERT reaction event', () => {
        const msg: Message = {
          id: 'msg_1',
          sender_id: 'user_1',
          content: 'Hello World',
          reactions: [],
          channel_id: 'chan_1',
          chat_id: 'chat_1',
          thread_id: null,
          created_at: '2026-06-28T12:00:00Z',
          edited_at: null,
        };
        const reaction: Reaction = {
          message_id: 'msg_1',
          user_id: 'user_2',
          emoji: '👍',
          created_at: '2026-06-28T12:10:00Z',
        };

        service._messages.set([msg]);

        triggerEvent('reactions', {
          table: 'reactions',
          eventType: 'INSERT',
          new: reaction,
        });

        expect(service._messages()[0].reactions).toContainEqual(reaction);
      });

      it('should remove reaction on DELETE reaction event', () => {
        const reaction1: Reaction = {
          message_id: 'msg_1',
          user_id: 'user_2',
          emoji: '👍',
          created_at: '2026-06-28T12:10:00Z',
        };
        const reaction2: Reaction = {
          message_id: 'msg_1',
          user_id: 'user_3',
          emoji: '❤️',
          created_at: '2026-06-28T12:11:00Z',
        };
        const msg: Message = {
          id: 'msg_1',
          sender_id: 'user_1',
          content: 'Hello World',
          reactions: [reaction1, reaction2],
          channel_id: 'chan_1',
          chat_id: 'chat_1',
          thread_id: null,
          created_at: '2026-06-28T12:00:00Z',
          edited_at: null,
        };

        service._messages.set([msg]);

        triggerEvent('reactions', {
          table: 'reactions',
          eventType: 'DELETE',
          old: reaction1,
        });

        expect(service._messages()[0].reactions).not.toContainEqual(reaction1);
        expect(service._messages()[0].reactions).toContainEqual(reaction2);
        expect(service._messages()[0].reactions.length).toBe(1);
      });
    });

    describe('database query operations', () => {
      it('should fetch chat messages and update the signal', async () => {
        const mockMessages: Message[] = [
          {
            id: 'msg_1',
            sender_id: 'user_1',
            content: 'Hello',
            reactions: [],
            channel_id: 'chan_1',
            chat_id: 'chat_1',
            thread_id: null,
            created_at: '2026-06-28T12:00:00Z',
            edited_at: null,
          },
        ];

        messagesChain.then.mockImplementation((onfulfilled: any) =>
          Promise.resolve({ data: mockMessages, error: null }).then(onfulfilled),
        );

        await service.getChatMessages('chat_1');

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages');
        expect(messagesChain.select).toHaveBeenCalled();
        expect(messagesChain.eq).toHaveBeenCalledWith('chat_id', 'chat_1');
        expect(messagesChain.is).toHaveBeenCalledWith('thread_id', null);
        expect(messagesChain.order).toHaveBeenCalledWith('created_at', { ascending: true });
        expect(service._messages()).toEqual(mockMessages);
      });

      it('should update a message', async () => {
        messagesChain.then.mockImplementation((onfulfilled: any) =>
          Promise.resolve({ data: { id: 'msg_1', content: 'Updated' }, error: null }).then(onfulfilled),
        );

        await service.updateMessage('msg_1', 'Updated');

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages');
        expect(messagesChain.update).toHaveBeenCalledWith(
          expect.objectContaining({ content: 'Updated' }),
        );
        expect(messagesChain.eq).toHaveBeenCalledWith('id', 'msg_1');
      });

      it('should create a new message', async () => {
        messagesChain.then.mockImplementation((onfulfilled: any) =>
          Promise.resolve({ data: { id: 'msg_2', content: 'New Message' }, error: null }).then(onfulfilled),
        );

        await service.createNewMessage('chat_1', 'user_1', 'New Message');

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages');
        expect(messagesChain.insert).toHaveBeenCalledWith({
          chat_id: 'chat_1',
          sender_id: 'user_1',
          content: 'New Message',
        });
      });

      describe('toggleReaction', () => {
        it('should remove reaction if it already exists', async () => {
          reactionsChain.then.mockImplementation((onfulfilled: any) =>
            Promise.resolve({ data: { id: 'reaction_1' }, error: null }).then(onfulfilled),
          );

          const result = await service.toggleReaction('msg_1', 'user_1', '👍');

          expect(reactionsChain.select).toHaveBeenNthCalledWith(1, '*');
          expect(reactionsChain.eq).toHaveBeenCalledWith('message_id', 'msg_1');
          expect(reactionsChain.eq).toHaveBeenCalledWith('user_id', 'user_1');
          expect(reactionsChain.eq).toHaveBeenCalledWith('emoji', '👍');
          expect(reactionsChain.maybeSingle).toHaveBeenCalled();

          expect(reactionsChain.delete).toHaveBeenCalled();
          expect(result).toEqual({ action: 'removed' });
        });

        it('should add reaction if it does not exist', async () => {
          let callCount = 0;
          reactionsChain.then.mockImplementation((onfulfilled: any) => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({ data: null, error: null }).then(onfulfilled);
            } else {
              return Promise.resolve({ data: { message_id: 'msg_1', user_id: 'user_1', emoji: '👍' }, error: null }).then(onfulfilled);
            }
          });

          const result = await service.toggleReaction('msg_1', 'user_1', '👍');

          expect(reactionsChain.select).toHaveBeenNthCalledWith(1, '*');
          expect(reactionsChain.insert).toHaveBeenCalledWith({
            message_id: 'msg_1',
            user_id: 'user_1',
            emoji: '👍',
          });
          expect(result).toEqual({ action: 'added' });
        });
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
          DatabaseMessages,
          { provide: Supabase, useValue: mockSupabaseService },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      service = TestBed.inject(DatabaseMessages);
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
