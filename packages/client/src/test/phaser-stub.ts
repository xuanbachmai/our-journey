/**
 * Phaser needs a browser, but the map and rules do not. Tests alias the engine
 * to this stub (see vite.config.ts) so area layouts and a whole playthrough can
 * run in Node. Anything that genuinely draws is never called from a test.
 */
class Scene {}
class Sprite {}
class Container {}

const Phaser = {
  Scene,
  GameObjects: { Sprite, Container },
  Math: {
    Between: (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1)),
    Clamp: (v: number, min: number, max: number) => Math.min(max, Math.max(min, v)),
  },
  Display: { Color: { HexStringToColor: (hex: string) => ({ color: parseInt(hex.replace('#', ''), 16) }) } },
};

export default Phaser;
export { Scene };
