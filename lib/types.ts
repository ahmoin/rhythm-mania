import type JSZip from "jszip";

export type Note = {
	lane: number;
	y: number;
	hold: number;
	held: boolean;
	done: boolean;
};
export type HitEffect = { lane: number; t: number; y: number };
export type ChartNote = { time: number; lane: number; hold: number };
export type Phase =
	| "menu"
	| "loading"
	| "difficulty"
	| "game"
	| "results"
	| "story-select";

export type StoryLevel = {
	song: string;
	diffIndex: number;
	label: string;
	minAccuracy: number;
};
export type SongMeta = { name: string; path: string };
export type Btn = {
	x: number;
	y: number;
	w: number;
	h: number;
	action: () => void;
};

export interface GameStateRefs {
	phase: Phase;
	selectedSong: string;
	selectedDiff: string;
	currentZip: JSZip | null;
	difficulties: { name: string; file: string }[];
	errorMsg: string;
	chart: ChartNote[];
	totalNotes: number;
	audio: HTMLAudioElement | null;
	revokeUrl: string;

	score: number;
	combo: number;
	maxCombo: number;
	perfectCount: number;
	greatCount: number;
	okayCount: number;
	missCount: number;

	mode: "free" | "story";
	storyLevel: number;

	resetGameState: () => void;
}
