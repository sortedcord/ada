export interface Telemetry {
  increment(
    name: string,
    value?: number,
    attributes?: Readonly<Record<string, string | number | boolean>>,
  ): void;
  observe(
    name: string,
    value: number,
    attributes?: Readonly<Record<string, string | number | boolean>>,
  ): void;
  flush(): Promise<void>;
}

export const noopTelemetry: Telemetry = {
  increment: () => undefined,
  observe: () => undefined,
  flush: () => Promise.resolve(),
};
