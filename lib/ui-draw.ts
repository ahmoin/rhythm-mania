import { GAME_SETTINGS } from "@/lib/constants";
import type { GameStateRefs, StoryLevel } from "@/lib/types";

type DrawBtnFn = (
	x: number,
	y: number,
	w: number,
	h: number,
	label: string,
	action: () => void,
) => void;

const { W, H } = GAME_SETTINGS;

export function drawStorySelect(
	ctx: CanvasRenderingContext2D,
	storyProgress: number,
	levels: StoryLevel[],
	drawBtn: DrawBtnFn,
	onPlay: () => void,
	onCreative: () => void,
) {
	ctx.fillStyle = "#181818";
	ctx.fillRect(0, 0, W, H);

	ctx.fillStyle = "#5a5";
	ctx.font = "bold 18px KiwiSoda";
	ctx.textAlign = "center";
	ctx.fillText("rhythm mania", W / 2, 30);

	ctx.fillStyle = "#555";
	ctx.font = "9px Typecast";
	if (storyProgress > 0) {
		ctx.fillText(
			`${storyProgress} / ${levels.length} levels cleared`,
			W / 2,
			46,
		);
	} else {
		ctx.fillText("story mode", W / 2, 46);
	}

	drawBtn(15, H / 2 - 22, W - 30, 36, "play", onPlay);
	drawBtn(15, H - 30, W - 30, 20, "creative mode", onCreative);
}

export function drawResults(
	ctx: CanvasRenderingContext2D,
	state: GameStateRefs,
	drawBtn: DrawBtnFn,
	storyOpts?: {
		passed: boolean;
		hasNext: boolean;
		onNext: () => void;
		onRetry: () => void;
		onBack: () => void;
	},
) {
	ctx.fillStyle = "#181818";
	ctx.fillRect(0, 0, W, H);

	ctx.fillStyle = "#5a5";
	ctx.font = "bold 16px Typecast";
	ctx.textAlign = "center";
	ctx.fillText("results", W / 2, 24);

	ctx.font = "bold 9px Typecast";
	ctx.fillStyle = "#ddd";
	const maxW = W - 20;
	ctx.save();
	ctx.beginPath();
	ctx.rect(10, 28, maxW, 22);
	ctx.clip();
	ctx.fillText(state.selectedSong, W / 2, 38);
	ctx.restore();

	ctx.fillStyle = "#888";
	ctx.font = "8px Typecast";
	ctx.fillText(state.selectedDiff, W / 2, 50);

	ctx.strokeStyle = "#333";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(15, 56);
	ctx.lineTo(W - 15, 56);
	ctx.stroke();

	ctx.fillStyle = "#fff";
	ctx.font = "bold 28px Typecast";
	ctx.fillText(`${state.score}`, W / 2, 84);
	ctx.fillStyle = "#555";
	ctx.font = "9px Typecast";
	ctx.fillText("score", W / 2, 96);

	const accuracy =
		state.totalNotes === 0
			? 100
			: ((state.perfectCount * 3 + state.greatCount * 2 + state.okayCount) /
					(state.totalNotes * 3)) *
				100;

	ctx.textAlign = "left";
	ctx.fillStyle = "#aaa";
	ctx.font = "bold 11px Typecast";
	ctx.fillText(`${accuracy.toFixed(2)}%`, 20, 118);
	ctx.textAlign = "right";
	ctx.fillText(`${state.maxCombo}x`, W - 20, 118);

	ctx.fillStyle = "#555";
	ctx.font = "8px Typecast";
	ctx.textAlign = "left";
	ctx.fillText("accuracy", 20, 128);
	ctx.textAlign = "right";
	ctx.fillText("max combo", W - 20, 128);

	ctx.strokeStyle = "#333";
	ctx.beginPath();
	ctx.moveTo(15, 134);
	ctx.lineTo(W - 15, 134);
	ctx.stroke();

	const rows: [string, number, string][] = [
		["Perfect", state.perfectCount, "#ffe066"],
		["Great", state.greatCount, "#66aaff"],
		["Okay", state.okayCount, "#aaa"],
		["Miss", state.missCount, "#f55"],
	];

	let ry = 150;
	for (const [label, count, color] of rows) {
		ctx.textAlign = "left";
		ctx.fillStyle = color;
		ctx.font = "bold 10px Typecast";
		ctx.fillText(label, 30, ry);
		ctx.textAlign = "right";
		ctx.fillStyle = "#ddd";
		ctx.fillText(`${count}`, W - 30, ry);
		ry += 18;
	}

	ctx.textAlign = "left";

	if (storyOpts) {
		const { passed, hasNext, onNext, onRetry, onBack } = storyOpts;
		ctx.textAlign = "center";
		ctx.font = "bold 13px Typecast";
		ctx.fillStyle = passed ? "#5a5" : "#f55";
		ctx.fillText(passed ? "PASS" : "FAIL", W / 2, ry + 8);
		ctx.textAlign = "left";

		const half = (W - 38) / 2;
		drawBtn(15, H - 30, half, 20, "retry", onRetry);
		if (passed && hasNext) {
			drawBtn(15 + half + 8, H - 30, half, 20, "next ->", onNext);
		} else {
			drawBtn(15 + half + 8, H - 30, half, 20, "story", onBack);
		}
	} else {
		drawBtn(15, H - 30, W - 30, 20, "back to menu", () => {
			state.phase = "menu";
		});
	}
}
