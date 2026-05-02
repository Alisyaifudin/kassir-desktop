export function genURL(pathname: string) {
  const url = new URL(import.meta.env.VITE_API_URL);
  url.pathname = pathname;
  return url;
}
