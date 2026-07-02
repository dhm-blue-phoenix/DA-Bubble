import { TestBed } from '@angular/core/testing';
import { DatabaseChats } from './db-chats';
import { Supabase } from './db-superbase';
import { PLATFORM_ID } from '@angular/core';

describe('DatabaseChats', () => {
  let service: DatabaseChats;
  let mockSupabaseClient: any;
  let chatMembersChain: any;
  let chatsChain: any;
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
      contains: vi.fn().mockImplementation((...args) => { logCall('contains', args); return chain; }),
      or: vi.fn().mockImplementation((...args) => { logCall('or', args); return chain; }),
      order: vi.fn().mockImplementation((...args) => { logCall('order', args); return chain; }),
      single: vi.fn().mockImplementation((...args) => { logCall('single', args); return chain; }),
      maybeSingle: vi.fn().mockImplementation((...args) => { logCall('maybeSingle', args); return chain; }),
      in: vi.fn().mockImplementation((...args) => { logCall('in', args); return chain; }),
      then: vi.fn().mockImplementation((onfulfilled: any) => {
        if (DEBUG_TEST_FLOW) console.log(`[Supabase Query][${tableName}] Resolving with:`, resolvedValue);
        return Promise.resolve(resolvedValue).then(onfulfilled);
      }),
    };
    return chain;
  }

  beforeEach(() => {
    chatMembersChain = createMockChain('chat_members', { data: [], error: null });
    chatsChain = createMockChain('chats', { data: null, error: null });
    defaultChain = createMockChain('default', { data: null, error: null });

    mockSupabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'chat_members') return chatMembersChain;
        if (table === 'chats') return chatsChain;
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
          DatabaseChats,
          { provide: Supabase, useValue: mockSupabaseService },
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      });
      service = TestBed.inject(DatabaseChats);
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    describe('getChatId', () => {
      it('should return existing chat ID if a shared chat exists between users', async () => {
        // Mock checkExistChat calls:
        // 1st call for currentUserId ('user_1')
        // 2nd call for otherUserId ('user_2') with shared chat filter
        let callCount = 0;
        chatMembersChain.then.mockImplementation((onfulfilled: any) => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({ data: [{ chat_id: 'chat_123' }], error: null }).then(onfulfilled);
          } else {
            return Promise.resolve({ data: [{ chat_id: 'chat_123' }], error: null }).then(onfulfilled);
          }
        });

        const chatId = await service.getChatId('user_1', 'user_2');

        expect(chatId).toBe('chat_123');
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('chat_members');
        expect(chatMembersChain.select).toHaveBeenCalledWith('chat_id');
        expect(chatMembersChain.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user_1');
        expect(chatMembersChain.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user_2');
        expect(chatMembersChain.in).toHaveBeenCalledWith('chat_id', ['chat_123']);
        // Verify no new chat creation was triggered
        expect(mockSupabaseClient.from).not.toHaveBeenCalledWith('chats');
      });

      it('should create new chat if current user has chats but none are shared with other user', async () => {
        // 1. checkExistChat 1st call: returns chat_other
        // 2. checkExistChat 2nd call (shared query): returns empty array (no shared chats)
        let chatMembersCallCount = 0;
        chatMembersChain.then.mockImplementation((onfulfilled: any) => {
          chatMembersCallCount++;
          if (chatMembersCallCount === 1) {
            return Promise.resolve({ data: [{ chat_id: 'chat_other' }], error: null }).then(onfulfilled);
          } else {
            return Promise.resolve({ data: [], error: null }).then(onfulfilled);
          }
        });

        // 3. createNewChat -> inserts chat, returns ID 'new_chat_789'
        chatsChain.then.mockImplementation((onfulfilled: any) => {
          return Promise.resolve({ data: { id: 'new_chat_789' }, error: null }).then(onfulfilled);
        });

        const chatId = await service.getChatId('user_1', 'user_2');

        expect(chatId).toBe('new_chat_789');
        // Verified chats insert was called
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('chats');
        expect(chatsChain.insert).toHaveBeenCalledWith({});
        // Verified membership insertion was called
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('chat_members');
        expect(chatMembersChain.insert).toHaveBeenCalledWith([
          { chat_id: 'new_chat_789', user_id: 'user_1' },
          { chat_id: 'new_chat_789', user_id: 'user_2' },
        ]);
      });

      it('should create new chat if current user has no chats at all', async () => {
        // checkExistChat 1st call: returns empty array
        chatMembersChain.then.mockImplementation((onfulfilled: any) => {
          return Promise.resolve({ data: [], error: null }).then(onfulfilled);
        });

        chatsChain.then.mockImplementation((onfulfilled: any) => {
          return Promise.resolve({ data: { id: 'new_chat_888' }, error: null }).then(onfulfilled);
        });

        const chatId = await service.getChatId('user_1', 'user_2');

        expect(chatId).toBe('new_chat_888');
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('chats');
        expect(chatsChain.insert).toHaveBeenCalledWith({});
        expect(chatMembersChain.insert).toHaveBeenCalledWith([
          { chat_id: 'new_chat_888', user_id: 'user_1' },
          { chat_id: 'new_chat_888', user_id: 'user_2' },
        ]);
      });

      it('should throw error if creating new chat fails', async () => {
        chatMembersChain.then.mockImplementation((onfulfilled: any) => {
          return Promise.resolve({ data: [], error: null }).then(onfulfilled);
        });

        const mockError = new Error('Insert failed');
        chatsChain.then.mockImplementation((onfulfilled: any) => {
          return Promise.resolve({ data: null, error: mockError }).then(onfulfilled);
        });

        await expect(service.getChatId('user_1', 'user_2')).rejects.toThrow('Insert failed');
      });
    });
  });

  describe('in Non-Browser environment', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          DatabaseChats,
          { provide: Supabase, useValue: mockSupabaseService },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      service = TestBed.inject(DatabaseChats);
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });
});
