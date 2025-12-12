export function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function fileToObjectUrl(f: File) {
  return URL.createObjectURL(f);
}

export function downloadImageFromSrc(src: string, filename = `momentia-${Date.now()}.png`) {
  const a = document.createElement('a');
  a.href = src;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
