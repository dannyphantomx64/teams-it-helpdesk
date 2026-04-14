import { QuestionLogger } from './questionLog';

export interface AnalyticsSummary {
  totalQuestions: number;
  answeredCount: number;
  escalatedCount: number;
  answerRate: number;
  escalationRate: number;
  averageConfidence: number;
  topQuestions: { question: string; count: number }[];
  unansweredTopics: { question: string; count: number }[];
  dailyVolume: { date: string; count: number }[];
}

export class AnalyticsService {
  constructor(private logger: QuestionLogger) {}

  getSummary(days: number = 30): AnalyticsSummary {
    const logs = this.logger.getRecentLogs(10000);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const recent = logs.filter((l) => new Date(l.timestamp) >= cutoff);

    const totalQuestions = recent.length;
    const answeredCount = recent.filter((l) => l.answered).length;
    const escalatedCount = recent.filter((l) => l.escalated).length;
    const answerRate = totalQuestions > 0 ? answeredCount / totalQuestions : 0;
    const escalationRate = totalQuestions > 0 ? escalatedCount / totalQuestions : 0;

    const scores = recent.filter((l) => l.topScore > 0).map((l) => l.topScore);
    const averageConfidence =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Top questions by frequency
    const questionCounts = new Map<string, number>();
    for (const log of recent) {
      const q = log.question.toLowerCase().trim();
      questionCounts.set(q, (questionCounts.get(q) ?? 0) + 1);
    }
    const topQuestions = [...questionCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([question, count]) => ({ question, count }));

    // Knowledge gaps — most frequent unanswered questions
    const unanswered = recent.filter((l) => !l.answered);
    const unansweredCounts = new Map<string, number>();
    for (const log of unanswered) {
      const q = log.question.toLowerCase().trim();
      unansweredCounts.set(q, (unansweredCounts.get(q) ?? 0) + 1);
    }
    const unansweredTopics = [...unansweredCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([question, count]) => ({ question, count }));

    // Daily volume
    const dailyCounts = new Map<string, number>();
    for (const log of recent) {
      const date = log.timestamp.slice(0, 10);
      dailyCounts.set(date, (dailyCounts.get(date) ?? 0) + 1);
    }
    const dailyVolume = [...dailyCounts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    return {
      totalQuestions,
      answeredCount,
      escalatedCount,
      answerRate,
      escalationRate,
      averageConfidence,
      topQuestions,
      unansweredTopics,
      dailyVolume,
    };
  }
}
