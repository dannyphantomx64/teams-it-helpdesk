interface ConversationHistory {
  messages: { role: 'user' | 'assistant'; content: string }[];
  lastActivity: Date;
}

export class ConversationMemory {
  private conversations = new Map<string, ConversationHistory>();
  private maxTurns: number;

  constructor(maxTurns: number = 10) {
    this.maxTurns = maxTurns;
  }

  getHistory(conversationId: string): { role: 'user' | 'assistant'; content: string }[] {
    return this.conversations.get(conversationId)?.messages ?? [];
  }

  addMessage(conversationId: string, role: 'user' | 'assistant', content: string): void {
    let conv = this.conversations.get(conversationId);
    if (!conv) {
      conv = { messages: [], lastActivity: new Date() };
      this.conversations.set(conversationId, conv);
    }

    conv.messages.push({ role, content });
    conv.lastActivity = new Date();

    // Keep only the last N turns (N user + N assistant messages)
    if (conv.messages.length > this.maxTurns * 2) {
      conv.messages = conv.messages.slice(-this.maxTurns * 2);
    }
  }

  clear(conversationId: string): void {
    this.conversations.delete(conversationId);
  }

  // Remove stale conversations (default: 30 minutes of inactivity)
  cleanup(maxAgeMs: number = 30 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, conv] of this.conversations) {
      if (now - conv.lastActivity.getTime() > maxAgeMs) {
        this.conversations.delete(id);
      }
    }
  }

  activeConversationCount(): number {
    return this.conversations.size;
  }
}
