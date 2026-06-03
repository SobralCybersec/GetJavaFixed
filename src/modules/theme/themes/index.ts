import { DEFAULT_THEME_ID, type Theme } from "../types";
import { bungouStrayDogs } from "./bungou-stray-dogs";
import { dragonBall } from "./dragon-ball";
import { gintama } from "./gintama";
import { naruto } from "./naruto";
import { javarfDefault } from "./javarf-default";
import { onePiece } from "./one-piece";
import { soloLeveling } from "./solo-leveling";
import { tokyoGhoul } from "./tokyo-ghoul";

const BUILTIN: Theme[] = [
  tokyoGhoul,
  dragonBall,
  gintama,
  naruto,
  bungouStrayDogs,
  soloLeveling,
  onePiece,
  javarfDefault
];

const BY_ID = new Map<string, Theme>(BUILTIN.map((t) => [t.id, t]));

export function listBuiltinThemes(): Theme[] {
  return BUILTIN;
}

export function getBuiltinTheme(id: string): Theme | undefined {
  return BY_ID.get(id);
}

export function getDefaultTheme(): Theme {
  return BY_ID.get(DEFAULT_THEME_ID) ?? BUILTIN[0];
}
