
// Parts defined

let part1 = [["0", "C#3"], ["4n", "G3"], [3 * Tone.Time("8n"), "G#3"], ["2n", "C3"]];
let part2 = [["0", "F#3"], ["8n", "G3"], ["4n", "G#3"], [3 * Tone.Time("8n"), "D4"], ["2n", "F#3"], [5 * Tone.Time("8n"), "G3"]]; // Phrygian gates, J.Adams, m.944
let part3 = [["0", "Gb3"], ["8n", "A3"], ["4n", "C4"], [3 * Tone.Time("8n"), "Gb3"], ["2n", "A3"], [5 * Tone.Time("8n"), "C4"]]; // Phrygian gates, J.Adams, m.945
let part3 = [["0", "F#3"], ["8n", "A#3"], ["4n", "B#3"], [3 * Tone.Time("8n"), "C4"], ["2n", "D4"], [5 * Tone.Time("8n"), "F#3"]]; // Phrygian gates, J.Adams, m.946


//a dotted quarter-note followed by an 8th note triplet
let seq1 =  ["C3", [null, "Eb3"], ["F4", "Bb4", "C5"]]; // if time is 4n
let seq2 = [["F#3","G3"], ["G#3","D4"],["F#3","G3"]];
let seq3 = [["Gb3","A3"], ["C4","Gb3"],["A3","C4"]];
let seq4 = [["F#3","A#3"], ["B#3","C4"],["D4","F#3"]];