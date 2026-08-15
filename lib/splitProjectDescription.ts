/**
 * Django `pView_script` parity: if description includes Arabic-Indic `١-`,
 * split into `.text-lines` chunks ending at each `.`; otherwise one block.
 */
export function splitProjectDescription(desc: string): string[] {
  if (!desc.includes("١-")) {
    return [desc];
  }

  const lines: string[] = [];
  let start = 0;
  for (let i = 0; i < desc.length; i += 1) {
    if (desc.charAt(i) === ".") {
      lines.push(desc.slice(start, i + 1));
      start = i + 1;
    }
  }
  return lines;
}
