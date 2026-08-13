export async function exportNodeToPng(node: HTMLElement, filename: string): Promise<void> {
  const { toPng } = await import('html-to-image');
  await document.fonts.ready;

  const dataUrl = await toPng(node, {
    pixelRatio: 3,
    backgroundColor: '#F5F6F8',
    cacheBust: true,
    skipAutoScale: true,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
