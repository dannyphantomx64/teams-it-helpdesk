import fs from 'fs';
import path from 'path';
import os from 'os';
import { QuestionLogger, LogEntry } from '../../services/questionLog';

describe('QuestionLogger', () => {
  let tmpDir: string;
  let logger: QuestionLogger;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qlog-'));
    logger = new QuestionLogger(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates the log directory if it does not exist', () => {
    const newDir = path.join(tmpDir, 'nested', 'dir');
    new QuestionLogger(newDir);
    expect(fs.existsSync(newDir)).toBe(true);
  });

  it('logs entries to a JSONL file', () => {
    const entry: LogEntry = {
      timestamp: '2025-01-01T00:00:00.000Z',
      userId: 'user-1',
      question: 'How do I reset my password?',
      answered: true,
      escalated: false,
      topScore: 0.92,
    };

    logger.log(entry);

    const logFile = path.join(tmpDir, 'questions.jsonl');
    expect(fs.existsSync(logFile)).toBe(true);

    const content = fs.readFileSync(logFile, 'utf-8').trim();
    expect(JSON.parse(content)).toEqual(entry);
  });

  it('retrieves recent logs', () => {
    for (let i = 0; i < 5; i++) {
      logger.log({
        timestamp: new Date().toISOString(),
        userId: `user-${i}`,
        question: `Question ${i}`,
        answered: true,
        escalated: false,
        topScore: 0.8,
      });
    }

    const recent = logger.getRecentLogs(3);
    expect(recent).toHaveLength(3);
    expect(recent[0].userId).toBe('user-2');
    expect(recent[2].userId).toBe('user-4');
  });

  it('returns empty array when no log file exists', () => {
    const freshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qlog-empty-'));
    const freshLogger = new QuestionLogger(freshDir);
    expect(freshLogger.getRecentLogs()).toEqual([]);
    fs.rmSync(freshDir, { recursive: true, force: true });
  });
});
