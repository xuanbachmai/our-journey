/** One shared palette so every generated sprite reads as the same world. */
export const P = {
  outline: '#4a2a3f',
  outlineSoft: '#6b4a5f',
  white: '#ffffff',
  cream: '#fff4dc',

  grass: '#8ad84f',
  grassLight: '#a6ea63',
  grassDark: '#6ec23f',
  grassDeep: '#55a832',

  path: '#e8c187',
  pathLight: '#f4d6a4',
  pathDark: '#d2a86e',

  soil: '#d9a76a',
  soilDark: '#c3915a',
  tilled: '#a3683b',
  tilledDark: '#7f4f2a',
  wet: '#6d4326',
  wetDark: '#53311a',

  water: '#5fcbff',
  waterLight: '#b3ecff',
  waterDark: '#3aa9ea',
  sand: '#f6e3a6',

  wood: '#c98b4e',
  woodDark: '#8f5a2c',
  woodLight: '#e2ad70',

  leaf: '#45b34f',
  leafLight: '#7be36c',
  leafDark: '#2f8c3b',
  trunk: '#8a5a33',
  trunkDark: '#5e3a1f',

  blossom: '#ffa7d6',
  blossomLight: '#ffd2ea',
  blossomDark: '#f07cbc',

  pink: '#ff8fcf',
  yellow: '#ffe066',
  orange: '#ffa94d',
  red: '#ff6b6b',
  purple: '#c58cff',
  blue: '#6fb8ff',
  mint: '#7de8c8',

  skin: '#ffdcc2',
  cheek: '#ffa6b8',
  eye: '#3b2a3a',

  roof: '#ff7f6b',
  roofDark: '#e0594d',
  roofLight: '#ffa896',
  wall: '#fff3dc',
  wallDark: '#eedcc0',
  window: '#a8e8ff',

  awningRed: '#ff6b7f',
  awningWhite: '#fff6f6',

  coin: '#ffd23f',
  coinDark: '#e3a100',
} as const;

export const FLOWER_COLORS = [P.pink, P.yellow, P.white, P.purple, P.red, P.orange, P.blue];
