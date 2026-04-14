import fs from 'fs';
import path from 'path';
import os from 'os';
import { QuestionLogger } from '../../services/questionLog';
import { AnalyticsService } from '../../services/analytics';

describe('AnalyticsService', () => {
  let tmpDir: string;
  let logger: QuestionLogger;
  let analytics: AnalyticsService;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'analytics-'));
    logger = new QuestionLogger(tmpDir);
    analytics = new AnalyticsService(logger);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns zeroed summary when no logs exist', () => {
    const summary = analytics.getSummary();
    expect(summary.totalQuestions).toBe(0);
    expect(summary.answerRate).toBe(0);
    expect(summary.escalationRate).toBe(0);
    expect(summary.topQuestions).toHaveLength(0);
  });

  it('computes correct answer and escalation rates', () => {
    logger.log({ timestamp: new Date().toISOString(), userId: 'u1', question: 'q1', answered: true, escalated: false, topScore: 0.9 });
    logger.log({ timestamp: new Date().toISOString(), userId: 'u2', question: 'q2', answered: true, escalated: false, topScore: 0.85 });
    logger.log({ timestamp: new Date().toISOString(), userId: 'u3', question: 'q3', answered: false, escalated: true, topScore: 0 });

    const summary = analytics.getSummary();
    expect(summary.totalQuestions).toBe(3);
    expect(summary.answeredCount).toBe(2);
    expect(summary.escalatedCount).toBe(1);
    expect(summary.answerRate).toBeCloseTo(2 / 3);
    expect(summary.escalationRate).toBeCloseTo(1 / 3);
  });

  it('identifies top questions by frequency', () => {
    for (let i = 0; i < 5; i++) {
      logger.log({ timestamp: new Date().toISOString(), userId: 'u1', question: 'password reset', answered: true, escalated: false, topScore: 0.9 });
    }
    for (let i = 0; i < 2; i++) {
      logger.log({ timestamp: new Date().toISOString(), userId: 'u2', question: 'vpn help', answered: true, escalated: false, topScore: 0.8 });
    }

    const summary = analytics.getSummary();
    expect(summary.topQuestions[0].question).toBe('password reset');
    expect(summary.topQuestions[0].count).toBe(5);
    expect(summary.topQuestions[1].question).toBe('vpn help');
  });

  it('identifies knowledge gaps from unanswered questions', () => {
    logger.log({ timestamp: new Date().toISOString(), userId: 'u1', question: 'drone policy', answered: false, escalated: false, topScore: 0 });
    logger.log({ timestamp: new Date().toISOString(), userId: 'u2', question: 'drone policy', answered: false, escalated: false, topScore: 0 });
    logger.log({ timestamp: new Date().toISOString(), userId: 'u3', question: 'desk height', answered: false, escalated: false, topScore: 0 });

    const summary = analytics.getSummary();
    expect(summary.unansweredTopics[0].question).toBe('drone policy');
    expect(summary.unansweredTopics[0].count).toBe(2);
  });
});
