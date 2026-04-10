import type { ChartNote } from "@/lib/types";

export type StoryChart = {
	chart: ChartNote[];
	bpm: number;
	duration: number;
};

function parse(bpm: number, visual: string): StoryChart {
	const lines = visual.split("\n");
	const beat = 60 / bpm;
	const leadIn = 4 * beat;
	const lineTime = 0.25 * beat;
	const notes: ChartNote[] = [];

	const activeHolds: (ChartNote | null)[] = [null, null];

	lines.forEach((line, index) => {
		if (line.trim() === "") return;

		const currentTime = leadIn + index * lineTime;

		const isBoth = line.startsWith("XX") || line.startsWith("CC");
		const isRight = line.startsWith(" ");
		const isLeft = !isRight || isBoth;
		const finalRight = isRight || isBoth;

		const processLane = (lane: number, char: string) => {
			if (char === "X") {
				notes.push({ time: currentTime, lane, hold: 0 });
				activeHolds[lane] = null;
			} else if (char === "C") {
				if (activeHolds[lane]) {
					activeHolds[lane]!.hold += lineTime;
				} else {
					const newNote = { time: currentTime, lane, hold: lineTime };
					notes.push(newNote);
					activeHolds[lane] = newNote;
				}
			} else {
				activeHolds[lane] = null;
			}
		};

		if (isLeft) processLane(0, line.trim()[0]);
		if (finalRight) {
			const char = isBoth ? line.trim()[1] : line.trim()[0];
			processLane(1, char);
		}
	});

	return {
		chart: notes.sort((a, b) => a.time - b.time),
		bpm,
		duration: leadIn + lines.length * lineTime + beat * 2,
	};
}

export const STORY_CHARTS: StoryChart[] = [
	parse(
		80,
		`
X

 X

C
C
C
C
C
C
C
C
C
C
C
C
C
C
C
C
C
C
C
C
 X

X

 X

X

 X

X

 C
 C
 C
 C
 C
 C
 C
 C
 C
 C
 C
 C
 C
 C
 C
 C
 C
 C
 C
 C
X

 X

X

 X
	`,
	),
];
