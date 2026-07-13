export type Related<T> = T | T[] | null;

export function firstRelated<T>(value: Related<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

