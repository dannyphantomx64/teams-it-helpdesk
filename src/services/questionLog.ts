import fs from 'fs';
import path from 'path';

export interface LogEntry {
  timestamp: string;
  userId: string;
  question: string;
  answered: boolean;
  escalated: boolean;
  topScore: number;
}

export class QuestionLogger {
  private logFile: string;

  constructor(logDir: string) {
    const absDir = path.resolve(logDir);
    if (!fs.existsSync(absDir)) {
      fs.mkdirSync(absDir, { recursive: true });
    }
    this.logFile = path.join(absDir, 'questions.jsonl');
  }

  log(entry: LogEntry): void {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.logFile, line, 'utf-8');
  }

  getRecentLogs(count: number = 50): LogEntry[] {
    if (!fs.existsSync(this.logFile)) return [];

    const lines = fs
      .readFileSync(this.logFile, 'utf-8')
      .trim()
      .split('\n')
      .filter(Boolean);

    return lines.slice(-count).map((line) => JSON.parse(line) as LogEntry);
  }
}
