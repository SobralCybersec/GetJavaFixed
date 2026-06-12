# Agent GIF Inventory

Place agent GIFs in `public/agents/`.

Header/runtime lookup uses paths like `/agents/<file>.gif`, so each file below should live in this folder:

## Built-in agent ids

| Agent ID | GIF filename |
| --- | --- |
| `builtin:coder` | `builtin-coder.gif` |
| `builtin:architect` | `builtin-architect.gif` |
| `builtin:reviewer` | `builtin-reviewer.gif` |
| `builtin:security` | `builtin-security.gif` |
| `builtin:cyber-osint-recon` | `builtin-cyber-osint-recon.gif` |
| `builtin:cyber-detection` | `builtin-cyber-detection.gif` |
| `builtin:cyber-exploration` | `builtin-cyber-exploration.gif` |
| `builtin:cyber-post-exploration` | `builtin-cyber-post-exploration.gif` |
| `builtin:designer` | `builtin-designer.gif` |
| `builtin:debugger` | `builtin-debugger.gif` |
| `builtin:db-goku` | `dragon-ball-goku.gif` |
| `builtin:db-bulma` | `dragon-ball-bulma.gif` |
| `builtin:gintama-gintoki` | `gintama-gintoki.gif` |
| `builtin:gintama-shinpachi` | `gintama-shinpachi.gif` |
| `builtin:naruto-naruto` | `naruto-naruto.gif` |
| `builtin:naruto-shikamaru` | `naruto-shikamaru.gif` |
| `builtin:bsd-dazai` | `bungou-dazai.gif` |
| `builtin:bsd-ranpo` | `bungou-ranpo.gif` |
| `builtin:solo-jinwoo` | `solo-jinwoo.gif` |
| `builtin:solo-cha` | `solo-cha-hae-in.gif` |
| `builtin:op-luffy` | `one-piece-luffy.gif` |
| `builtin:op-robin` | `one-piece-robin.gif` |
| `builtin:javarf-codex` | `javarf-codex-mono.gif` |

## Theme-resolved GIF filenames

These are also referenced at runtime when general-role agents are re-skinned by active theme. They are not separate agent ids, but the files still need to exist in `public/agents/` if you want themed GIFs to show.

| Theme or variant | GIF filenames |
| --- | --- |
| `tokyo-ghoul` | `tokyo-haise.gif`, `tokyo-arima.gif`, `tokyo-akira.gif`, `tokyo-amon.gif`, `tokyo-touka.gif` |
| `dragon-ball` | `dragon-ball-bulma.gif`, `dragon-ball-brief.gif`, `dragon-ball-piccolo.gif`, `dragon-ball-vegeta.gif`, `dragon-ball-whis.gif` |
| `gintama` | `gintama-gintoki.gif`, `gintama-katsura.gif`, `gintama-shinpachi.gif`, `gintama-kagura.gif`, `gintama-tsukuyo.gif` |
| `naruto` | `naruto-naruto.gif`, `naruto-shikamaru.gif`, `naruto-kakashi.gif`, `naruto-gaara.gif`, `naruto-sakura.gif` |
| `bungou-stray-dogs` | `bungou-dazai.gif`, `bungou-kunikida.gif`, `bungou-ranpo.gif`, `bungou-fukuzawa.gif`, `bungou-yosano.gif` |
| `solo-leveling` | `solo-jinwoo.gif`, `solo-jinho.gif`, `solo-cha-hae-in.gif`, `solo-igris.gif`, `solo-woo-jinchul.gif` |
| `one-piece` | `one-piece-franky.gif`, `one-piece-nami.gif`, `one-piece-robin.gif`, `one-piece-zoro.gif`, `one-piece-sanji.gif` |
| `javarf-default` | `javarf-codex-mono.gif`, `javarf-graphite.gif`, `javarf-lint.gif`, `javarf-boundary.gif`, `javarf-grid.gif` |
