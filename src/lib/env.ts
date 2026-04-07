export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

export function optionalEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() ? value : null;
}
