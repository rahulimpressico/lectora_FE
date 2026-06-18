/**
 * Returns the lowercase file extension from a path, without the leading dot.
 * Returns empty string if no extension is found.
 */
export function fileExtension(path: string): string {
  const parts = path.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}
