const MAX_NAME_LENGTH = 80;

export function validateName(value: string): string | null {
  const name = value.trim();
  if (name.length === 0) return "Enter a name.";
  if (name.length > MAX_NAME_LENGTH) return "Use 80 characters or fewer.";
  return null;
}
