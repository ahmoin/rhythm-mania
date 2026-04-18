# Rhythm Mania

A 2-lane rhythm game built with Next.js and the Canvas API. Supports osu beatmap files (.osz) and a story mode with synthesized audio.

## Features

- Free Play: upload any `.osz` beatmap file and play it
- Story Mode: 4 pre-built levels with progression saved to localStorage
- Hit judgments: Perfect, Great, Okay, Miss with combo and accuracy tracking
- Note types: tap notes and hold notes
- Controls: `A` / `D` keys for left and right lanes

## How to Play

1. Story Mode vs. Creative Mode: hit play button in the middle for story mode, hit the creative mode button at the bottom for creative mode
2. Free Play: click the custom song button in creative mode, select a `.osz` file, pick a difficulty, and play
3. Notes scroll downward; press `A` for the left lane and `D` for the right lane
4. Hold notes require holding the key for their duration

## Scoring

| Judgment | Window | Points |
|---|---|---|
| Perfect | ±7px | 3 |
| Great | ±18px | 2 |
| Okay | any other window | 1 |
| Miss | fully missed | 0 |

Accuracy is calculated as earned points divided by maximum possible points.
