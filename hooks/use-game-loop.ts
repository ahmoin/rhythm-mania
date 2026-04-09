"use client";

import { useEffect } from "react";
import { GAME_SETTINGS, SONG_FILES } from "@/lib/constants";
import { loadFromZip, loadOsz } from "@/lib/game-actions";
import type {
	Btn,
	GameStateRefs,
	HitEffect,
	Note,
	SongMeta,
} from "@/lib/types";
import { drawResults } from "@/lib/ui-draw";

export function useGameLoop(
	canvasRef: React.RefObject<HTMLCanvasElement | null>,
	fileRef: React.RefObject<HTMLInputElement | null>,
) {
	useEffect(() => {
		const canvas = canvasRef.current;
		const fileInput = fileRef.current;
		if (!canvas || !fileInput) return;

		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
		const { W, H, HZ, TH, NW, TW, SPEED } = GAME_SETTINGS;
		const SCROLL_TIME = H / SPEED;

		const sprite = new Image();
		sprite.src = "/beat-indicator-template.png";
		const outlineSprite = new Image();
		outlineSprite.src = "/beat-indicator-template-outline.png";
		const tintedSprite = document.createElement("canvas");
		const NH = Math.round(NW * (5 / 32));
		tintedSprite.width = NW;
		tintedSprite.height = NH;
		const tCtx = tintedSprite.getContext("2d");
		if (!tCtx) return;

		const state: GameStateRefs = {
			phase: "menu",
			selectedSong: "",
			selectedDiff: "",
			currentZip: null,
			difficulties: [],
			errorMsg: "",
			chart: [],
			totalNotes: 0,
			audio: null,
			revokeUrl: "",
			score: 0,
			combo: 0,
			maxCombo: 0,
			perfectCount: 0,
			greatCount: 0,
			okayCount: 0,
			missCount: 0,
			resetGameState: () => {
				chartIdx = 0;
				notes = [];
				keys[0] = false;
				keys[1] = false;
				hitEffects = [];
				state.score = 0;
				state.perfectCount = 0;
				state.greatCount = 0;
				state.okayCount = 0;
				state.missCount = 0;
				state.combo = 0;
				state.maxCombo = 0;
				status = "";
				statusTimer = 0;
				started = false;
			},
		};

		let chartIdx = 0,
			started = false,
			status = "",
			statusTimer = 0;
		let mouseX = 0,
			mouseY = 0;
		let notes: Note[] = [];
		let hitEffects: HitEffect[] = [];
		let buttons: Btn[] = [];
		const keys = [false, false];

		const songMetas: SongMeta[] = SONG_FILES.map((f) => ({
			name: f.replace(/^\d+\s+/, "").replace(/\.osz$/i, ""),
			path: `https://res.cloudinary.com/rhythm-mania/raw/upload/songs/${encodeURIComponent(f)}`,
		}));

		const recordHit = (judgement: "perfect" | "great" | "okay" | "miss") => {
			if (judgement === "perfect") {
				state.perfectCount++;
				state.score++;
				state.combo++;
				status = "Perfect";
			} else if (judgement === "great") {
				state.greatCount++;
				state.score++;
				state.combo++;
				status = "Great";
			} else if (judgement === "okay") {
				state.okayCount++;
				state.combo = 0;
				status = "Okay";
			} else {
				state.missCount++;
				state.combo = 0;
				status = "Miss!";
			}
			statusTimer = 50;
			if (state.combo > state.maxCombo) state.maxCombo = state.combo;
		};

		const drawBtn = (
			x: number,
			y: number,
			w: number,
			h: number,
			label: string,
			action: () => void,
		) => {
			const isHot =
				mouseX >= x && mouseX < x + w && mouseY >= y && mouseY < y + h;
			ctx.fillStyle = isHot ? "#2a4a2a" : "#1a2a1a";
			ctx.strokeStyle = "#5a5";
			ctx.fillRect(x, y, w, h);
			ctx.strokeRect(x, y, w, h);
			ctx.fillStyle = isHot ? "#fff" : "#aaa";
			ctx.font = "9px Typecast";
			ctx.textAlign = "center";
			ctx.fillText(label, x + w / 2, y + h / 2 + 4);
			ctx.textAlign = "left";
			buttons.push({ x, y, w, h, action });
		};

		const loop = () => {
			const SCALE = window.innerHeight / H;
			canvas.width = Math.round(W * SCALE);
			canvas.height = Math.round(H * SCALE);
			ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
			ctx.imageSmoothingEnabled = false;
			buttons = [];

			if (state.phase === "menu") {
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
					drawBtn(15, y, W - 30, 36, song.name, () => {
						state.selectedSong = song.name;
						loadOsz(state, song.path);
					});
					y += 44;
				}
				drawBtn(15, H - 30, W - 30, 20, "custom song (.osz)", () =>
					fileInput.click(),
				);
			} else if (state.phase === "difficulty") {
				ctx.fillStyle = "#181818";
				ctx.fillRect(0, 0, W, H);
				ctx.fillStyle = "#5a5";
				ctx.font = "bold 13px Typecast";
				ctx.textAlign = "center";
				ctx.fillText("select difficulty", W / 2, 28);
				ctx.textAlign = "left";
				let y = 50;
				for (const d of state.difficulties) {
					drawBtn(15, y, W - 30, 24, d.name, () => {
						if (state.currentZip) loadFromZip(state, state.currentZip, d.file);
					});
					y += 32;
				}
				drawBtn(15, H - 30, 50, 20, "<- back", () => {
					state.phase = "menu";
					state.difficulties = [];
				});
			} else if (state.phase === "game") {
				ctx.fillStyle = "#181818";
				ctx.fillRect(0, 0, W, H);
				if (!started) {
					ctx.fillStyle = "#fff";
					ctx.font = "bold 16px Typecast";
					ctx.textAlign = "center";
					ctx.fillText("press any key to start", W / 2, H / 2);
					ctx.textAlign = "left";
				} else {
					for (const fx of hitEffects) {
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
						ctx.drawImage(outlineSprite, -rw / 2, -rh / 2, rw, rh);
						ctx.restore();
					}
					hitEffects = hitEffects.filter((fx) => fx.t > 0);
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
					if (statusTimer > 0) {
						statusTimer--;
						ctx.font = "12px Typecast";
						ctx.fillStyle = "#ddd";
						ctx.textAlign = "right";
						ctx.fillText(status, W - 15, HZ - 12);
					}
					ctx.textAlign = "left";
					ctx.fillStyle = "#aaa";
					ctx.font = "14px Typecast";
					ctx.fillText("A", 58, HZ + 20);
					ctx.fillText("D", 148, HZ + 20);

					const now = state.audio?.currentTime ?? 0;
					while (
						chartIdx < state.chart.length &&
						state.chart[chartIdx].time - now <= SCROLL_TIME
					) {
						const cn = state.chart[chartIdx++];
						notes.push({
							lane: cn.lane,
							y: HZ - (cn.time - now) * SPEED,
							hold: cn.hold * SPEED,
							held: false,
							done: false,
						});
					}
					for (const n of notes) {
						if (n.done) continue;
						n.y += SPEED / 60;
						const x = n.lane === 0 ? 45 : 135;
						if (n.hold > 0) {
							ctx.fillStyle = "rgba(85,179,59,0.4)";
							ctx.fillRect(x + NW / 2 - TW / 2, n.y, TW, n.hold);
							ctx.drawImage(tintedSprite, x, n.y + n.hold, NW, TH);
						} else {
							ctx.drawImage(tintedSprite, x, n.y, NW, TH);
						}
						if (n.y > HZ + 25) {
							n.done = true;
							recordHit("miss");
						}
					}
					notes = notes.filter((n) => !n.done);
					if (state.audio?.ended) state.phase = "results";
				}
			} else if (state.phase === "results") {
				drawResults(ctx, state, drawBtn);
			}

			requestAnimationFrame(loop);
		};

		const down = (e: KeyboardEvent) => {
			if (state.phase !== "game") return;
			if (!started) {
				started = true;
				state.audio?.play();
				return;
			}
			const l =
				e.key.toLowerCase() === "a" ? 0 : e.key.toLowerCase() === "d" ? 1 : -1;
			if (l !== -1) {
				keys[l] = true;
				const c = notes.find(
					(n) => !n.done && n.lane === l && Math.abs(n.y - HZ) < 35,
				);
				if (c) {
					c.done = true;
					hitEffects.push({ lane: l, t: 15, y: c.y });
					recordHit(Math.abs(c.y - HZ) < 10 ? "perfect" : "great");
				}
			}
		};

		window.addEventListener("keydown", down);
		canvas.addEventListener("click", () => {
			const b = buttons.find(
				(b) =>
					mouseX >= b.x &&
					mouseX < b.x + b.w &&
					mouseY >= b.y &&
					mouseY < b.y + b.h,
			);
			if (b) b.action();
		});
		canvas.addEventListener("mousemove", (e) => {
			const r = canvas.getBoundingClientRect();
			mouseX = (e.clientX - r.left) * (W / r.width);
			mouseY = (e.clientY - r.top) * (H / r.height);
		});
		fileInput.addEventListener("change", () => {
			if (fileInput.files?.[0]) {
				state.selectedSong = fileInput.files[0].name;
				loadOsz(state, fileInput.files[0]);
			}
		});

		let loaded = 0;
		const check = () => {
			if (++loaded === 3) loop();
		};
		sprite.onload = () => {
			tCtx.drawImage(sprite, 0, 0, NW, NH);
			tCtx.globalCompositeOperation = "multiply";
			tCtx.fillStyle = "#55b33b";
			tCtx.fillRect(0, 0, NW, NH);
			tCtx.globalCompositeOperation = "destination-in";
			tCtx.drawImage(sprite, 0, 0, NW, NH);
			check();
		};
		outlineSprite.onload = check;
		Promise.all([
			document.fonts.load("16px KiwiSoda"),
			document.fonts.load("16px Typecast"),
			document.fonts.load("bold 16px Typecast"),
		]).then(check);

		return () => {
			window.removeEventListener("keydown", down);
			if (state.audio) state.audio.pause();
		};
	}, [canvasRef, fileRef]);
}
