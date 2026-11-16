// CSV as spreadsheets write it (RFC 4180): quoted fields, quotes doubled, line breaks inside quotes.
// Read with its delimiter guessed (",", ";" or tab); written UTF-8 with a BOM, so Excel shows accents.

export function parseCsv(text: string, delimiter?: string): string[][] {
  const body = text.replace(/^\uFEFF/, "");
  const sep = delimiter ?? guessDelimiter(body);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (quoted) {
      if (char === '"') {
        if (body[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += char;
    } else if (char === '"' && field === "") quoted = true;
    else if (char === sep) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && body[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** The delimiter used most in the first line, outside quotes. */
export function guessDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0]?.replace(/"[^"]*"/g, "") ?? "";
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length - 1] as const);
  return counts.sort((a, b) => b[1] - a[1])[0]?.[1] ? (counts[0]?.[0] ?? ",") : ",";
}

export function writeCsv(rows: string[][], delimiter = ","): string {
  const quote = (cell: string) => (/["\r\n]/.test(cell) || cell.includes(delimiter) ? `"${cell.replace(/"/g, '""')}"` : cell);
  return `\uFEFF${rows.map((row) => row.map(quote).join(delimiter)).join("\r\n")}\r\n`;
}
