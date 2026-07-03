export const SPH_TOGGLE = 'SPH_TOGGLE' as const;

export interface ToggleMessage {
  type: typeof SPH_TOGGLE;
}

export function isToggleMessage(msg: unknown): msg is ToggleMessage {
  return typeof msg === 'object' && msg !== null && (msg as { type?: unknown }).type === SPH_TOGGLE;
}
