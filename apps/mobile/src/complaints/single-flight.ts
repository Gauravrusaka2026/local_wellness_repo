export type SingleFlightState<Result> = { current: Promise<Result> | null };

export const runSingleFlight = <Result>(
  state: SingleFlightState<Result>,
  operation: () => Promise<Result>,
): Promise<Result> => {
  if (state.current !== null) {
    return state.current;
  }

  const pending = operation().finally(() => {
    if (state.current === pending) {
      state.current = null;
    }
  });
  state.current = pending;
  return pending;
};
