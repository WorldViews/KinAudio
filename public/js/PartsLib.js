
// Parts defined

let part1 = [["0", "C#3"], ["4n", "G3"], [3 * Tone.Time("8n"), "G#3"], ["2n", "C3"]];
let part2 = [["0", "F#3"], ["8n", "G3"], ["4n", "G#3"], [3 * Tone.Time("8n"), "D4"], ["2n", "F#3"], [5 * Tone.Time("8n"), "G3"]]; // Phrygian gates, J.Adams, m.944
let part2 = [["0", "F#3"], ["8n", "G3"], ["4n", "G#3"], [3 * Tone.Time("8n"), "D4"], ["2n", "F#3"], [5 * Tone.Time("8n"), "G3"]]; // Phrygian gates, J.Adams, m.945
let part2 = [["0", "F#3"], ["8n", "G3"], ["4n", "G#3"], [3 * Tone.Time("8n"), "D4"], ["2n", "F#3"], [5 * Tone.Time("8n"), "G3"]]; // Phrygian gates, J.Adams, m.946


//a dotted quarter-note followed by an 8th note triplet
let seq1 =  ["C3", [null, "Eb3"], ["F4", "Bb4", "C5"]]; // if time is 4n
let seq2 = [];