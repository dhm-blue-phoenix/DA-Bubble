import { TestBed } from '@angular/core/testing';
import { DatabaseThreats } from './db-threats';
import { Supabase } from './db-superbase';

describe('DatabaseThreats', () => {
  let service: DatabaseThreats;
  let mockSupabaseClient: any;
  let threadsChain: any;
  let messagesChain: any;
  let defaultChain: any;
  let mockSupabaseService: any;

  const DEBUG_TEST_FLOW = true;

  function createMockChain(tableName: string, resolvedValue: any) {
    let queryActions: any[] = [];

    const logCall = (method: string, args: any[]) => {
      queryActions.push({ method, args });
    };

    const chain: any = {
      select: vi.fn().mockImplementation((...args) => { logCall('select', args); return chain; }),
      update: vi.fn().mockImplementation((...args) => { logCall('update', args); return chain; }),
      insert: vi.fn().mockImplementation((...args) => { logCall('insert', args); return chain; }),
      eq: vi.fn().mockImplementation((...args) => { logCall('eq', args); return chain; }),
      single: vi.fn().mockImplementation((...args) => { logCall('single', args); return chain; }),
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
    threadsChain = createMockChain('threads', { data: [], error: null });
    messagesChain = createMockChain('messages', { data: [], error: null });
    defaultChain = createMockChain('default', { data: null, error: null });

    mockSupabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'threads') return threadsChain;
        if (table === 'messages') return messagesChain;
        return defaultChain;
      }),
    };

    mockSupabaseService = {
      supabase: mockSupabaseClient,
    };

    TestBed.configureTestingModule({
      providers: [
        DatabaseThreats,
        { provide: Supabase, useValue: mockSupabaseService },
      ],
    });
    service = TestBed.inject(DatabaseThreats);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getThreatId', () => {
    it('should return existing thread id if thread exists', async () => {
      threadsChain.then.mockImplementation((onfulfilled: any) =>
        Promise.resolve({ data: [{ id: 'existing_thread_1' }], error: null }).then(onfulfilled),
      );

      const result = await service.getThreatId('msg_1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('threads');
      expect(threadsChain.select).toHaveBeenCalledWith('id');
      expect(threadsChain.eq).toHaveBeenCalledWith('root_message_id', 'msg_1');
      expect(result).toBe('existing_thread_1');
    });

    it('should create new thread and update message if thread does not exist', async () => {
      let threadsCallCount = 0;
      threadsChain.then.mockImplementation((onfulfilled: any) => {
        threadsCallCount++;
        if (threadsCallCount === 1) {
          // checkExistThread returns empty
          return Promise.resolve({ data: [], error: null }).then(onfulfilled);
        } else {
          // createNewThread returns new thread
          return Promise.resolve({ data: [{ id: 'new_thread_1' }], error: null }).then(onfulfilled);
        }
      });

      messagesChain.then.mockImplementation((onfulfilled: any) =>
        Promise.resolve({ data: null, error: null }).then(onfulfilled),
      );

      const result = await service.getThreatId('msg_2');

      // Assert thread creation
      expect(threadsChain.insert).toHaveBeenCalledWith({ root_message_id: 'msg_2' });
      expect(threadsChain.select).toHaveBeenCalled();

      // Assert message update
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages');
      expect(messagesChain.update).toHaveBeenCalledWith({ thread_id: 'new_thread_1' });
      expect(messagesChain.eq).toHaveBeenCalledWith('id', 'msg_2');
      expect(messagesChain.single).toHaveBeenCalled();

      expect(result).toBe('new_thread_1');
    });
  });
});
