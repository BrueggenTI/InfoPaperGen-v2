// Comprehensive debugging and error tracking system
export interface DebugInfo {
  timestamp: string;
  operation: string;
  step: string;
  status: 'success' | 'error' | 'warning' | 'info';
  details: any;
  error?: Error | string;
  duration?: number;
}

export class DebugLogger {
  private static logs: DebugInfo[] = [];
  private static maxLogs = 100;

  static log(operation: string, step: string, status: DebugInfo['status'], details: any, error?: Error | string) {
    const debugInfo: DebugInfo = {
      timestamp: new Date().toISOString(),
      operation,
      step,
      status,
      details,
      error: error instanceof Error ? error.message : error,
      duration: details?.duration
    };

    this.logs.unshift(debugInfo);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Console output for development
    const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : status === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} [${operation}] ${step}:`, details);
    
    if (error) {
      console.error(`  Error:`, error);
    }
  }

  static getLogs(operation?: string): DebugInfo[] {
    if (operation) {
      return this.logs.filter(log => log.operation === operation);
    }
    return this.logs;
  }

  static clearLogs() {
    this.logs = [];
  }

  // Helper methods for common operations
  static success(operation: string, step: string, details: any) {
    this.log(operation, step, 'success', details);
  }

  static error(operation: string, step: string, details: any, error?: Error | string) {
    this.log(operation, step, 'error', details, error);
  }

  static warning(operation: string, step: string, details: any) {
    this.log(operation, step, 'warning', details);
  }

  static info(operation: string, step: string, details: any) {
    this.log(operation, step, 'info', details);
  }

  // Timing wrapper
  static async time<T>(operation: string, step: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    try {
      this.info(operation, step, { message: 'Started' });
      const result = await fn();
      const duration = Date.now() - startTime;
      this.success(operation, step, { message: 'Completed', duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(operation, step, { message: 'Failed', duration: `${duration}ms` }, error as Error);
      throw error;
    }
  }
}