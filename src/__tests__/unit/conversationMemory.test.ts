import { ConversationMemory } from '../../services/conversationMemory';

describe('ConversationMemory', () => {
  let memory: ConversationMemory;

  beforeEach(() => {
    memory = new ConversationMemory(3);
  });

  it('returns empty history for unknown conversations', () => {
    expect(memory.getHistory('unknown')).toEqual([]);
  });

  it('stores and retrieves messages', () => {
    memory.addMessage('conv1', 'user', 'Hello');
    memory.addMessage('conv1', 'assistant', 'Hi there!');

    const history = memory.getHistory('conv1');
    expect(history).toHaveLength(2);
    expect(history[0]).toEqual({ role: 'user', content: 'Hello' });
    expect(history[1]).toEqual({ role: 'assistant', content: 'Hi there!' });
  });

  it('keeps conversations separate', () => {
    memory.addMessage('conv1', 'user', 'Question A');
    memory.addMessage('conv2', 'user', 'Question B');

    expect(memory.getHistory('conv1')).toHaveLength(1);
    expect(memory.getHistory('conv2')).toHaveLength(1);
    expect(memory.getHistory('conv1')[0].content).toBe('Question A');
  });

  it('trims history to maxTurns * 2 messages', () => {
    // maxTurns=3, so max 6 messages (3 user + 3 assistant)
    for (let i = 0; i < 5; i++) {
      memory.addMessage('conv1', 'user', `Q${i}`);
      memory.addMessage('conv1', 'assistant', `A${i}`);
    }

    const history = memory.getHistory('conv1');
    expect(history).toHaveLength(6);
    expect(history[0].content).toBe('Q2');
  });

  it('clears a specific conversation', () => {
    memory.addMessage('conv1', 'user', 'Test');
    memory.clear('conv1');
    expect(memory.getHistory('conv1')).toEqual([]);
  });

  it('tracks active conversation count', () => {
    memory.addMessage('conv1', 'user', 'A');
    memory.addMessage('conv2', 'user', 'B');
    expect(memory.activeConversationCount()).toBe(2);
  });
});
