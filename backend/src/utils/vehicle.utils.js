export const normalizeRegistrationNumber = (registrationNumber) => {
  if (!registrationNumber) {
    return null;
  }

  return String(registrationNumber)
    .replace(/[\s-]/g, "")
    .toUpperCase();
};

// Characters that OCR/typefaces commonly confuse with each other, so a
// mismatch on these alone shouldn't fail a registration-number comparison.
const AMBIGUOUS_CHARS = new Map([
  ["O", new Set(["O", "0"])], ["0", new Set(["0", "O"])],
  ["I", new Set(["I", "1"])],
  ["Z", new Set(["Z", "2"])], ["2", new Set(["2", "Z"])],
  ["S", new Set(["S", "5"])], ["5", new Set(["5", "S"])],
  ["B", new Set(["B", "8"])], ["8", new Set(["8", "B"])],
  ["T", new Set(["T", "1"])], ["1", new Set(["1", "I", "T"])],
]);

export function registrationNumbersLookAlike(expected, extracted) {
  const a = normalizeRegistrationNumber(expected);
  const b = normalizeRegistrationNumber(extracted);
  if (!a || !b || a.length !== b.length) return false;
  return [...a].every((char, index) => char === b[index] || AMBIGUOUS_CHARS.get(char)?.has(b[index]));
}