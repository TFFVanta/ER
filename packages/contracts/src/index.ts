export type ExoticContract<TInput = unknown, TOutput = TInput> = {
  name: string;
  version: string;
  parse(input: TInput): TOutput;
};

export function defineContract<TInput, TOutput>(contract: ExoticContract<TInput, TOutput>): ExoticContract<TInput, TOutput> {
  return contract;
}

export const identity = {
  name: "@exotic/contracts",
  tagline: "Everything Is Exotic."
};
