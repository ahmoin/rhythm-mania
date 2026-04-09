import type { StoryLevel } from "@/lib/types";

export const SONG_FILES = [
	"62004 Adele - Skyfall.osz",
	"357777 NOMA - Brain Power.osz",
	"1034041 James Landino - Spellbound.osz",
	"1168718 Don Toliver - No Idea.osz",
];

export const STORY_LEVELS: StoryLevel[] = [
	{ song: "", diffIndex: 0, label: "Loop One", minAccuracy: 50 },
	{ song: "", diffIndex: 0, label: "Loop Two", minAccuracy: 55 },
	{ song: "", diffIndex: 0, label: "Loop Three", minAccuracy: 60 },
	{ song: "", diffIndex: 0, label: "Loop Four", minAccuracy: 65 },
];

export const GAME_SETTINGS = {
	W: 220,
	H: 400,
	HZ: 280, // hit Zone Y position
	TH: 6, // note Thickness
	NW: 45, // note Width
	TW: 12, // hold Tail Width
	SPEED: 90,
};
