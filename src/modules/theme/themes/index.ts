import { DEFAULT_THEME_ID, type Theme } from "../types";
import { caffeine } from "./caffeine";
import { bungouStrayDogs } from "./bungou-stray-dogs";
import { catppuccin } from "./catppuccin";
import { claude } from "./claude";
import { dragonBall } from "./dragon-ball";
import { gintama } from "./gintama";
import { gruvbox } from "./gruvbox";
import { nord } from "./nord";
import { naruto } from "./naruto";
import { rosePine } from "./rose-pine";
import { sage } from "./sage";
import { javarfDefault } from "./javarf-default";
import { onePiece } from "./one-piece";
import { soloLeveling } from "./solo-leveling";
import { tide } from "./tide";
import { tokyoGhoul } from "./tokyo-ghoul";
import { tokyoNight } from "./tokyo-night";

const BUILTIN: Theme[] = [
  tokyoGhoul,
  dragonBall,
  gintama,
  naruto,
  bungouStrayDogs,
  soloLeveling,
  onePiece,
  tokyoNight,
  javarfDefault,
  claude,
  nord,
  tide,
  sage,
  catppuccin,
  gruvbox,
  rosePine,
  caffeine,
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
