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

  function createMockChain(resolvedValue: any) {
    const chain: any = {
      select: vi.fn().mockImplementation(() => chain),
      insert: vi.fn().mockImplementation(() => chain),
      eq: vi.fn().mockImplementation(() => chain),
      in: vi.fn().mockImplementation(() => chain),
      single: vi.fn().mockImplementation(() => chain),
      then: vi.fn().mockImplementation((onfulfilled: any) => Promise.resolve(resolvedValue).then(onfulfilled)),
    };
    return chain;
  }

  beforeEach(() => {
    chatMembersChain = createMockChain({ data: [], error: null });
    chatsChain = createMockChain({ data: null, error: null });
    defaultChain = createMockChain({ data: null, error: null });

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
