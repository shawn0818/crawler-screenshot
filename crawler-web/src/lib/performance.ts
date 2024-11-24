export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private metrics: Map<string, number[]> = new Map();
  
    private constructor() {}
  
    static getInstance(): PerformanceMonitor {
      if (!PerformanceMonitor.instance) {
        PerformanceMonitor.instance = new PerformanceMonitor();
      }
      return PerformanceMonitor.instance;
    }
  
    startMeasure(name: string) {
      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }
      performance.mark(`${name}-start`);
    }
  
    endMeasure(name: string) {
      performance.mark(`${name}-end`);
      try {
        const measure = performance.measure(name, `${name}-start`, `${name}-end`);
        const metrics = this.metrics.get(name) || [];
        metrics.push(measure.duration);
        this.metrics.set(name, metrics);
      } catch (error) {
        console.error(`Error measuring ${name}:`, error);
      }
    }
  
    getMetrics(name: string) {
      return this.metrics.get(name) || [];
    }
  }