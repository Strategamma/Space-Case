// Display legacy saved transmissions using the current cycle terminology.
export function cycleText(text = '') {
  return String(text)
    .replace(/\bfirst-night\b/gi, 'first dark cycle')
    .replace(/\btonight\b/gi, 'this dark cycle')
    .replace(/\bnightly\b/gi, 'each dark cycle')
    .replace(/\bnight(s)?\b/gi, (_, plural) => `dark cycle${plural || ''}`)
    .replace(/\bdaytime\b/gi, 'light cycle')
    .replace(/\btoday\b/gi, 'this light cycle')
    .replace(/\bday(s)?\b/gi, (_, plural) => `light cycle${plural || ''}`)
    .replace(/\bdawn\b/gi, 'light cycle')
    .replace(/\bdusk\b/gi, 'dark cycle');
}
