/** Scene-space anchors for the music nook (room rect from layout: x 16..22, z 0..6). */
export const MUSIC_ROOM = { x: 16, z: 0, w: 6, d: 6 };
/**
 * Deck anchor for the turntable, sitting flush on the record console's top
 * (console top = y 0.74). The platter is deliberately offset left of this
 * anchor on the deck; the tonearm sits right. Audio emitters mount here too.
 */
export const TURNTABLE_POS: [number, number, number] = [18.7, 0.74, 0.75];
