import html2canvas from "html2canvas";

export async function captureElementToJpeg(el: HTMLElement, filename: string) {
  const canvas = await html2canvas(el, {
    backgroundColor: "#0a0a0a",
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Renderiza um nó React fora da tela, espera o paint, captura e remove.
 * Uso:
 *   await renderAndCapture(<RankingReport rows={...} title="..."/>, "ranking.jpg");
 */
export async function renderAndCapture(node: React.ReactNode, filename: string) {
  const { createRoot } = await import("react-dom/client");
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "1080px";
  container.style.background = "#0a0a0a";
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(node as any);
  // espera paint
  await new Promise((r) => setTimeout(r, 200));
  try {
    await captureElementToJpeg(container, filename);
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}
