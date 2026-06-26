/** Trigger a client-side file download from in-memory content. */
export const download = (
  filename: string,
  content: string,
  type: string,
): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
