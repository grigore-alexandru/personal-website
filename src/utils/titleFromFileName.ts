export function titleFromFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  return withoutExt
    .replace(/[-_. ]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
