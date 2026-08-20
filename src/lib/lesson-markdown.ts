/** Inline Markdown used in lesson explanations (bold, italic, clickable code). */
export function parseInlineStyles(text: string): string {
  const codeSpans: string[] = [];
  const withCodePlaceholders = text.replace(
    /`(.*?)`/g,
    (_, codeText: string) => {
      const idx = codeSpans.length;
      codeSpans.push(codeText);
      return `\0CODE${idx}\0`;
    },
  );

  const withEmphasis = withCodePlaceholders
    .replace(/\n/g, "<br/>")
    .replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="text-zinc-900 dark:text-zinc-100 font-bold">$1</strong>',
    )
    .replace(
      /\*(.*?)\*/g,
      '<em class="italic text-zinc-700 dark:text-zinc-200">$1</em>',
    );

  return withEmphasis.replace(/\0CODE(\d+)\0/g, (_, idx: string) => {
    const codeText = codeSpans[Number(idx)]!;
    const escaped = codeText
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/"/g, "&quot;");
    return `<code onclick="if(window.setTerminalInput) { window.setTerminalInput('${escaped}'); }" class="cursor-pointer hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950/20 transition-all duration-150 inline break-words text-orange-600 dark:text-orange-400 font-mono bg-zinc-100 dark:bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">${codeText}</code>`;
  });
}

/** Plain text after stripping tags — used to detect leftover Markdown markers. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}
