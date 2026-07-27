export interface ObserverMetric {
  name: string;
  value: number;
  unit: string;
  safe: boolean;
}

export const ExoticObserver = {
  collect(): ObserverMetric[] {
    return [
      { name: "cpu", value: 0.23, unit: "load", safe: true },
      { name: "memory", value: 0.41, unit: "load", safe: true },
      { name: "temperature", value: 58, unit: "celsius", safe: true },
      { name: "networkLatency", value: 22, unit: "ms", safe: true }
    ];
  }
};
