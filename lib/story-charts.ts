import type { ChartNote } from "@/lib/types";

export type StoryChart = {
	chart: ChartNote[];
	bpm: number;
	duration: number;
};

function build(
	bpm: number,
	bars: number,
	pattern: [number, number, number?][],
): StoryChart {
	const beat = 60 / bpm;
	const leadIn = 4 * beat;
	const notes: ChartNote[] = [];
	for (let bar = 0; bar < bars; bar++) {
		for (const [b, lane, holdBeats = 0] of pattern) {
			notes.push({
				time: leadIn + (bar * 4 + b) * beat,
				lane,
				hold: holdBeats * beat,
			});
		}
	}
	return {
		chart: notes.sort((a, b) => a.time - b.time),
		bpm,
		duration: leadIn + bars * 4 * beat + beat * 2,
	};
}

export const STORY_CHARTS: StoryChart[] = [
	build(80, 16, [
		[0, 0],
		[1, 1],
		[2, 0],
		[3, 1],
	]),

	build(90, 16, [
		[0, 0, 1],
		[1, 1],
		[1.5, 0],
		[2, 0, 1],
		[3, 1],
		[3.5, 0],
	]),

	build(100, 16, [
		[0, 0],
		[0.5, 0],
		[1, 1, 0.5],
		[1.5, 0],
		[2, 0],
		[2.5, 1, 0.5],
		[3, 0],
		[3.5, 1],
	]),

	build(110, 16, [
		[0, 0, 0.5],
		[0.5, 0],
		[1, 1, 0.5],
		[1.75, 1],
		[2, 0, 0.5],
		[2.5, 0],
		[3, 1, 0.5],
		[3.25, 0],
		[3.75, 1],
	]),
];
