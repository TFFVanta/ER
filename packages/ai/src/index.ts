export type ExoticModelMessage = { role: "system" | "user" | "assistant" | "tool"; content: string };

export type ExoticModelResponse = { text: string; usage?: Record<string, number> };

export type ExoticModel = {
  name: string;
  generate(messages: ExoticModelMessage[]): Promise<ExoticModelResponse>;
};

export type ExoticTool<TInput = unknown, TOutput = unknown> = {
  name: string;
  description: string;
  run(input: TInput): Promise<TOutput>;
};

export type ExoticAgent = {
  name: string;
  model: ExoticModel;
  tools: ExoticTool[];
};

export function defineModel(model: ExoticModel): ExoticModel { return model; }
export function defineTool<TInput, TOutput>(tool: ExoticTool<TInput, TOutput>): ExoticTool<TInput, TOutput> { return tool; }
export function defineAgent(agent: ExoticAgent): ExoticAgent { return agent; }

export const identity = { name: "@exotic/ai", tagline: "Everything Is Exotic." };
