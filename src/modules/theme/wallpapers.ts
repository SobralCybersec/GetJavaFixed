import type { BuiltinWallpaper } from "./types";

export const BUILTIN_WALLPAPERS: BuiltinWallpaper[] = [
  {
    id: "tokyo-ghoul-red-black",
    label: "Tokyo Ghoul Red Black",
    path: "/wallpapers/tokyo-ghoul-red-black.png",
    thumbnailPath: "/wallpapers/tokyo-ghoul-red-black.png",
    attribution: "Bundled JavaRf anime-inspired abstract wallpaper",
  },
  {
    id: "dragon-ball-sunset",
    label: "Dragon Ball Sunset",
    path: "/wallpapers/dragon-ball-sunset.png",
    thumbnailPath: "/wallpapers/dragon-ball-sunset.png",
    attribution: "Bundled JavaRf anime-inspired abstract wallpaper",
  },
  {
    id: "gintama-neon-city",
    label: "Gintama Neon City",
    path: "/wallpapers/gintama-neon-city.png",
    thumbnailPath: "/wallpapers/gintama-neon-city.png",
    attribution: "Bundled JavaRf anime-inspired abstract wallpaper",
  },
  {
    id: "naruto-leaf-storm",
    label: "Naruto Leaf Storm",
    path: "/wallpapers/naruto-leaf-storm.png",
    thumbnailPath: "/wallpapers/naruto-leaf-storm.png",
    attribution: "Bundled JavaRf anime-inspired abstract wallpaper",
  },
  {
    id: "bungou-noir-ink",
    label: "Bungou Noir Ink",
    path: "/wallpapers/bungou-noir-ink.png",
    thumbnailPath: "/wallpapers/bungou-noir-ink.png",
    attribution: "Bundled JavaRf anime-inspired abstract wallpaper",
  },
  {
    id: "solo-leveling-shadow",
    label: "Solo Leveling Shadow",
    path: "/wallpapers/solo-leveling-shadow.png",
    thumbnailPath: "/wallpapers/solo-leveling-shadow.png",
    attribution: "Bundled JavaRf anime-inspired abstract wallpaper",
  },
  {
    id: "one-piece-grand-line",
    label: "One Piece Grand Line",
    path: "/wallpapers/one-piece-grand-line.png",
    thumbnailPath: "/wallpapers/one-piece-grand-line.png",
    attribution: "Bundled JavaRf anime-inspired abstract wallpaper",
  },
];

const BY_ID = new Map(BUILTIN_WALLPAPERS.map((wallpaper) => [wallpaper.id, wallpaper]));

export function getBuiltinWallpaper(id: string): BuiltinWallpaper | undefined {
  return BY_ID.get(id);
}
