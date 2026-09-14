import { BrowserSession } from './BrowserSession';
import {
  BrowserError,
  BrowserLaunchOptions,
  BrowserType,
  IBrowserManager,
  SessionInfo,
} from './BrowserTypes';
import { BrowserFactory } from './BrowserFactory';

export class BrowserManager implements IBrowserManager {
  private sessions = new Map<string, BrowserSession>();
  private activeSessionId: string | null = null;

  constructor(private readonly factory: BrowserFactory = new BrowserFactory()) {}

  async createSession(
    browserType: BrowserType = 'chrome',
    options: BrowserLaunchOptions = {}
  ): Promise<BrowserSession> {
    const session = await this.factory.createSession(browserType, options);
    this.sessions.set(session.id, session);
    this.activeSessionId = session.id;
    return session;
  }

  getSession(sessionId?: string): BrowserSession | undefined {
    const id = sessionId || this.activeSessionId;
    if (!id) return undefined;
    return this.sessions.get(id);
  }

  getActiveSession(): BrowserSession | undefined {
    return this.getSession();
  }

  async listSessions(): Promise<SessionInfo[]> {
    const results: SessionInfo[] = [];
    for (const session of this.sessions.values()) {
      results.push(await session.getInfo());
    }
    return results;
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new BrowserError('SESSION_NOT_FOUND', `Session "${sessionId}" was not found.`);
    }

    await session.close();
    this.sessions.delete(sessionId);

    if (this.activeSessionId === sessionId) {
      const remaining = Array.from(this.sessions.keys());
      this.activeSessionId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
    }
  }

  async closeAll(): Promise<void> {
    for (const session of this.sessions.values()) {
      await session.close();
    }
    this.sessions.clear();
    this.activeSessionId = null;
  }
}
