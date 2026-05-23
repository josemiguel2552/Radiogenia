export function computeEditDistance(original: string, final: string): number {
  if (!original && !final) return 0;
  if (!original) return final.length;
  if (!final) return original.length;

  const a = original.trim();
  const b = final.trim();

  if (a === b) return 0;

  const lenA = a.length;
  const lenB = b.length;

  if (lenA > 8000 || lenB > 8000) {
    return Math.abs(lenA - lenB);
  }

  let prev = Array.from({ length: lenB + 1 }, (_, i) => i);
  let curr = new Array(lenB + 1);

  for (let i = 1; i <= lenA; i++) {
    curr[0] = i;
    for (let j = 1; j <= lenB; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[lenB];
}

export function computeEditRate(original: string, final: string): number {
  if (!original) return 0;
  const dist = computeEditDistance(original, final);
  return Math.min(1, dist / original.length);
}

export function computeStructuralCompleteness(
  templateText: string,
  findingsText: string,
): { total: number; filled: number } {
  const sectionHeaders = templateText.match(/\*{2,3}([^*]+)\*{2,3}/g);
  if (!sectionHeaders || sectionHeaders.length === 0) {
    return { total: 0, filled: 0 };
  }

  const total = sectionHeaders.length;
  const findings = findingsText.toLowerCase();
  let filled = 0;

  for (const header of sectionHeaders) {
    const label = header.replace(/\*/g, "").trim().toLowerCase();
    const idx = findings.indexOf(label);
    if (idx >= 0) {
      const afterLabel = findings.slice(idx + label.length, idx + label.length + 100).trim();
      if (afterLabel.length > 2 && !/^[\s:.\-—]*$/.test(afterLabel.slice(0, 20))) {
        filled++;
      }
    }
  }

  return { total, filled };
}
