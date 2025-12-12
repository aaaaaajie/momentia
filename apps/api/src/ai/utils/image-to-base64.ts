export async function fetchUrlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab).toString('base64');
}

export function stripDataUrlPrefix(x: string) {
  const m = x.match(/^data:.*?;base64,(.*)$/i);
  return m ? m[1] : x;
}

export function isHttpUrl(x: string) {
  return /^https?:\/\//i.test(x);
}
