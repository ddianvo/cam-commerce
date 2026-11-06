import { ConfigService } from '@nestjs/config';
import { ChatMemoryService } from '../src/ai/chat-memory.service';
import { ChatState } from '../src/ai/ai.schemas';
function memory(max = 100) {
  return new ChatMemoryService(
    new ConfigService({ CHAT_TTL_SECONDS: 60, CHAT_MAX_SESSIONS: max, REDIS_URL: '' }),
  );
}
const save = async (state: ChatState) => ({
  state: { history: [...state.history, { role: 'user' as const, content: 'giày nam' }] },
  result: state.history.length,
});
describe('chat session isolation and lifecycle', () => {
  afterEach(() => jest.useRealTimers());
  it('keeps one user history and isolates another user with the same sessionId', async () => {
    const m = memory();
    expect(await m.withSession('a', 's', save)).toBe(0);
    expect(await m.withSession('a', 's', save)).toBe(1);
    expect(await m.withSession('b', 's', save)).toBe(0);
  });
  it('expires idle history', async () => {
    jest.useFakeTimers();
    const m = memory();
    await m.withSession('a', 's', save);
    jest.advanceTimersByTime(61000);
    expect(await m.withSession('a', 's', save)).toBe(0);
  });
  it('rejects concurrent messages in the same session', async () => {
    const m = memory();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const pending = m.withSession('a', 's', async (state) => {
      await gate;
      return { state, result: 1 };
    });
    await expect(m.withSession('a', 's', save)).rejects.toThrow('đang xử lý');
    release();
    await pending;
  });
  it('releases locks and discards partial history on failure', async () => {
    const m = memory();
    await expect(
      m.withSession('a', 's', async (state) => {
        state.history.push({ role: 'user', content: 'partial' });
        throw new Error('provider failed');
      }),
    ).rejects.toThrow('provider failed');
    expect(await m.withSession('a', 's', save)).toBe(0);
  });
  it('bounds the session map', async () => {
    const m = memory(1);
    await m.withSession('a', 's', save);
    await expect(m.withSession('b', 's', save)).rejects.toThrow('đầy');
  });
});
