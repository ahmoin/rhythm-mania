import { GAME_SETTINGS } from "@/lib/constants";
import type {
	GameLoopLocals,
	GameStateRefs,
	SongMeta,
	StoryLevel,
} from "@/lib/types";

type DrawBtnFn = (
	x: number,
	y: number,
	w: number,
	h: number,
	label: string,
	action: () => void,
) => void;

const { W, H } = GAME_SETTINGS;

export function drawMenu(
	ctx: CanvasRenderingContext2D,
	songMetas: SongMeta[],
	drawBtn: DrawBtnFn,
	onSongSelect: (song: SongMeta) => void,
	onCustom: () => void,
	onBack: () => void,
) {
	ctx.fillStyle = "#181818";
	ctx.fillRect(0, 0, W, H);
	ctx.fillStyle = "#5a5";
	ctx.font = "bold 18px KiwiSoda";
	ctx.textAlign = "center";
	ctx.fillText("rhythm mania", W / 2, 30);
	ctx.fillStyle = "#555";
	ctx.font = "9px Typecast";
	ctx.fillText("select a song", W / 2, 46);
	ctx.textAlign = "left";
	let y = 60;
	for (const song of songMetas) {
		drawBtn(15, y, W - 30, 36, song.name, () => onSongSelect(song));
		y += 44;
	}
	drawBtn(15, H - 54, W - 30, 20, "custom song (.osz)", onCustom);
	drawBtn(15, H - 30, W - 30, 20, "<- back", onBack);
}

export function drawDifficulty(
	ctx: CanvasRenderingContext2D,
	state: GameStateRefs,
	drawBtn: DrawBtnFn,
	onSelectDiff: (file: string) => void,
	onBack: () => void,
) {
	ctx.fillStyle = "#181818";
	ctx.fillRect(0, 0, W, H);
	ctx.fillStyle = "#5a5";
	ctx.font = "bold 13px Typecast";
	ctx.textAlign = "center";
	ctx.fillText("select difficulty", W / 2, 28);
	ctx.textAlign = "left";
	let y = 50;
	for (const d of state.difficulties) {
		drawBtn(15, y, W - 30, 24, d.name, () => onSelectDiff(d.file));
		y += 32;
	}
	drawBtn(15, H - 30, 50, 20, "<- back", onBack);
}

export function drawGame(
	ctx: CanvasRenderingContext2D,
	state: GameStateRefs,
	locals: GameLoopLocals,
	sprites: { outline: HTMLImageElement; tinted: HTMLCanvasElement },
	callbacks: {
		recordHit: (j: "perfect" | "great" | "okay" | "miss") => void;
		playTick: () => void;
		playKick: () => void;
		playSnare: () => void;
	},
) {
	const { HZ, NW, TH, TW, SPEED } = GAME_SETTINGS;
	const SCROLL_TIME = H / SPEED;

	ctx.fillStyle = "#181818";
	ctx.fillRect(0, 0, W, H);

	if (!locals.started) {
		ctx.fillStyle = "#fff";
		ctx.font = "bold 16px Typecast";
		ctx.textAlign = "center";
		ctx.fillText("press any key to start", W / 2, H / 2);
		ctx.textAlign = "left";
		return;
	}

	for (const fx of locals.hitEffects) {
		fx.t--;
		const t = 1 - fx.t / 15;
		const scale = 1 + 0.2 * Math.sqrt(1 - (t - 1) ** 2);
		const alpha = 0.5 * Math.sqrt(1 - t * t);
		const cx = fx.lane === 0 ? 45 + NW / 2 : 135 + NW / 2;
		const cy = fx.y;
		const rw = NW + 10;
		const rh = rw * (10 / 32);
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.translate(cx, cy);
		ctx.scale(scale, scale);
		ctx.drawImage(sprites.outline, -rw / 2, -rh / 2, rw, rh);
		ctx.restore();
	}
	locals.hitEffects = locals.hitEffects.filter((fx) => fx.t > 0);

	ctx.strokeStyle = "#5a5";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(35, HZ);
	ctx.lineTo(W - 35, HZ);
	ctx.stroke();

	ctx.fillStyle = "#fff";
	ctx.font = "bold 20px Typecast";
	ctx.textAlign = "right";
	ctx.fillText(`${state.score}`, W - 15, HZ - 30);
	if (state.combo > 1) {
		ctx.fillStyle = "#5a5";
		ctx.font = "bold 11px Typecast";
		ctx.textAlign = "left";
		ctx.fillText(`${state.combo}x`, 15, HZ - 30);
	}
	if (locals.statusTimer > 0) {
		locals.statusTimer--;
		ctx.font = "12px Typecast";
		ctx.fillStyle = "#ddd";
		ctx.textAlign = "right";
		ctx.fillText(locals.status, W - 15, HZ - 12);
	}
	ctx.textAlign = "left";
	ctx.fillStyle = "#aaa";
	ctx.font = "14px Typecast";
	ctx.fillText("A", 58, HZ + 20);
	ctx.fillText("D", 148, HZ + 20);

	const now = state.audio
		? state.audio.currentTime
		: (performance.now() - locals.storyStartMs) / 1000;

	if (state.mode === "story") {
		const beat = Math.floor(now / (60 / locals.levelBpm));
		if (beat > locals.lastTickBeat) {
			locals.lastTickBeat = beat;
			callbacks.playTick();
		}
	}

	while (
		locals.chartIdx < state.chart.length &&
		state.chart[locals.chartIdx].time - now <= SCROLL_TIME
	) {
		const cn = state.chart[locals.chartIdx++];
		locals.notes.push({
			lane: cn.lane,
			y: HZ - (cn.time - now) * SPEED,
			hold: cn.hold * SPEED,
			held: false,
			done: false,
		});
	}

	for (const n of locals.notes) {
		if (n.done) continue;
		n.y += SPEED / 60;
		const x = n.lane === 0 ? 45 : 135;
		if (n.hold > 0) {
			if (n.held) {
				if (!locals.keys[n.lane]) {
					n.done = true;
					callbacks.recordHit("miss");
				} else if (n.y >= HZ + n.hold) {
					n.done = true;
					callbacks.recordHit("great");
				}
			} else if (n.y > HZ + 25) {
				n.done = true;
				callbacks.recordHit("miss");
			}
			ctx.fillStyle = n.held ? "rgba(85,179,59,0.7)" : "rgba(85,179,59,0.4)";
			ctx.fillRect(x + NW / 2 - TW / 2, n.y - n.hold, TW, n.hold);
			ctx.drawImage(sprites.tinted, x, n.y, NW, TH);
		} else {
			ctx.drawImage(sprites.tinted, x, n.y, NW, TH);
			if (n.y > HZ + 25) {
				n.done = true;
				callbacks.recordHit("miss");
			}
		}
	}
	locals.notes = locals.notes.filter((n) => !n.done);

	if (state.audio?.ended) state.phase = "results";
	if (!state.audio && now >= locals.levelDuration) state.phase = "results";
}

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
