// Commons originals can be many MB; serve a resized thumbnail instead.
// upload.wikimedia.org/.../commons/a/ab/Name.jpg
//   → upload.wikimedia.org/.../commons/thumb/a/ab/Name.jpg/960px-Name.jpg
// Widths should be Wikimedia's standard steps (e.g. 500, 960, 1280) to hit cache.
export function commonsThumb(url: string, width: number): string {
  // Commons API URLs carry utm_* tracking params; drop the query first.
  const m = url.split("?")[0].match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/(\w\/\w\w)\/([^/]+)$/);
  if (!m) return url;
  const [, base, hash, file] = m;
  return `${base}/thumb/${hash}/${file}/${width}px-${file}`;
}
