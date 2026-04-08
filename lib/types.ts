export type Note = {
	lane: number;
	y: number;
	hold: number;
	held: boolean;
	done: boolean;
};

export type HitEffect = {
	lane: number;
	t: number;
	y: number;
};

export type ChartNote = { time: number; lane: number; hold: number };

export type Phase = "menu" | "loading" | "difficulty" | "game" | "results";

export type SongMeta = { name: string; path: string };

export type Btn = {
	x: number;
	y: number;
	w: number;
	h: number;
	action: () => void;
};
