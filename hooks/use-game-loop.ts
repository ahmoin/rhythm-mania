"use client";

import { useEffect } from "react";
import { GAME_SETTINGS, SONG_FILES, STORY_LEVELS } from "@/lib/constants";
import { loadFromZip, loadOsz } from "@/lib/game-actions";
import { STORY_CHARTS } from "@/lib/story-charts";
import { playKick, playSnare, playTick } from "@/lib/synth";
import type { Btn, GameLoopLocals, GameStateRefs, SongMeta } from "@/lib/types";
import {
	drawDifficulty,
	drawGame,
	drawMenu,
	drawResults,
	drawStorySelect,
} from "@/lib/ui-draw";

export function useGameLoop(
	canvasRef: React.RefObject<HTMLCanvasElement | null>,
	fileRef: React.RefObject<HTMLInputElement | null>,
) {
	useEffect(() => {
		const canvas = canvasRef.current;
		const fileInput = fileRef.current;
		if (!canvas || !fileInput) return;

		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
		const { W, H, HZ, NW } = GAME_SETTINGS;

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

		let storyProgress = (() => {
			try {
				return (
					parseInt(localStorage.getItem("rm_story_progress") ?? "0", 10) || 0
				);
			} catch {
				return 0;
			}
		})();

		const songPath = (f: string) =>
			`https://res.cloudinary.com/rhythm-mania/raw/upload/songs/${encodeURIComponent(f)}`;

		const keys = [false, false];

		const locals: GameLoopLocals = {
			started: false,
			hitEffects: [],
			notes: [],
			keys,
			storyStartMs: 0,
			levelBpm: 120,
			levelDuration: 0,
			lastTickBeat: -1,
			chartIdx: 0,
			statusTimer: 0,
			status: "",
		};

		const state: GameStateRefs = {
			phase: "story-select",
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
			mode: "free",
			storyLevel: 0,
			resetGameState: () => {
				locals.chartIdx = 0;
				locals.notes = [];
				keys[0] = false;
				keys[1] = false;
				locals.hitEffects = [];
				state.score = 0;
				state.perfectCount = 0;
				state.greatCount = 0;
				state.okayCount = 0;
				state.missCount = 0;
				state.combo = 0;
				state.maxCombo = 0;
				locals.status = "";
				locals.statusTimer = 0;
				locals.started = false;
			},
		};

		const startChart = (idx: number) => {
			const data = STORY_CHARTS[idx];
			if (state.audio) {
				state.audio.pause();
				state.audio = null;
			}
			if (state.revokeUrl) {
				URL.revokeObjectURL(state.revokeUrl);
				state.revokeUrl = "";
			}
			state.storyLevel = idx;
			state.mode = "story";
			state.chart = data.chart.slice();
			state.totalNotes = data.chart.length;
			state.selectedSong = STORY_LEVELS[idx].label;
			state.selectedDiff = `Level ${idx + 1}`;
			locals.levelBpm = data.bpm;
			locals.levelDuration = data.duration;
			state.resetGameState();
			state.phase = "game";
		};

		const songMetas: SongMeta[] = SONG_FILES.map((f) => ({
			name: f.replace(/^\d+\s+/, "").replace(/\.osz$/i, ""),
			path: songPath(f),
		}));

		const recordHit = (judgement: "perfect" | "great" | "okay" | "miss") => {
			if (judgement === "perfect") {
				state.perfectCount++;
				state.score++;
				state.combo++;
				locals.status = "Perfect";
			} else if (judgement === "great") {
				state.greatCount++;
				state.score++;
				state.combo++;
				locals.status = "Great";
			} else if (judgement === "okay") {
				state.okayCount++;
				state.combo = 0;
				locals.status = "Okay";
			} else {
				state.missCount++;
				state.combo = 0;
				locals.status = "Miss!";
			}
			locals.statusTimer = 50;
			if (state.combo > state.maxCombo) state.maxCombo = state.combo;
		};

		let mouseX = 0,
			mouseY = 0;
		let buttons: Btn[] = [];

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
				drawMenu(
					ctx,
					songMetas,
					drawBtn,
					(song) => {
						state.selectedSong = song.name;
						state.mode = "free";
						loadOsz(state, song.path);
					},
					() => {
						state.mode = "free";
						fileInput.click();
					},
					() => {
						state.phase = "story-select";
					},
				);
			} else if (state.phase === "difficulty") {
				drawDifficulty(
					ctx,
					state,
					drawBtn,
					(file) => {
						if (state.currentZip) loadFromZip(state, state.currentZip, file);
					},
					() => {
						state.phase = "menu";
						state.difficulties = [];
					},
				);
			} else if (state.phase === "game") {
				drawGame(
					ctx,
					state,
					locals,
					{ outline: outlineSprite, tinted: tintedSprite },
					{ recordHit, playTick, playKick, playSnare },
				);
			} else if (state.phase === "story-select") {
				drawStorySelect(
					ctx,
					storyProgress,
					STORY_LEVELS,
					drawBtn,
					() => {
						startChart(0);
					},
					() => {
						state.phase = "menu";
					},
				);
			} else if (state.phase === "results") {
				if (state.mode === "story") {
					const accuracy =
						state.totalNotes === 0
							? 100
							: ((state.perfectCount * 3 +
									state.greatCount * 2 +
									state.okayCount) /
									(state.totalNotes * 3)) *
								100;
					const level = STORY_LEVELS[state.storyLevel];
					const passed = accuracy >= level.minAccuracy;
					if (passed && state.storyLevel + 1 > storyProgress) {
						storyProgress = state.storyLevel + 1;
						try {
							localStorage.setItem("rm_story_progress", String(storyProgress));
						} catch {}
					}
					drawResults(ctx, state, drawBtn, {
						passed,
						hasNext: state.storyLevel < STORY_LEVELS.length - 1,
						onNext: () => {
							startChart(state.storyLevel + 1);
						},
						onRetry: () => {
							startChart(state.storyLevel);
						},
						onBack: () => {
							state.phase = "story-select";
						},
					});
				} else {
					drawResults(ctx, state, drawBtn);
				}
			}

			requestAnimationFrame(loop);
		};

		const down = (e: KeyboardEvent) => {
			if (state.phase !== "game") return;
			if (!locals.started) {
				locals.started = true;
				locals.lastTickBeat = -1;
				if (state.audio) state.audio.play();
				else locals.storyStartMs = performance.now();
				return;
			}
			const l =
				e.key.toLowerCase() === "a" ? 0 : e.key.toLowerCase() === "d" ? 1 : -1;
			if (l !== -1) {
				keys[l] = true;
				const c = locals.notes.find(
					(n) => !n.done && !n.held && n.lane === l && Math.abs(n.y - HZ) < 18,
				);
				if (c) {
					if (c.hold > 0) {
						c.held = true;
					} else {
						c.done = true;
					}
					locals.hitEffects.push({ lane: l, t: 15, y: c.y });
					recordHit(Math.abs(c.y - HZ) < 8 ? "perfect" : "great");
					if (state.mode === "story") {
						if (l === 0) playKick();
						else playSnare();
					}
				} else {
					const isHolding = locals.notes.some((n) => n.held && n.lane === l);
					const bad = locals.notes.find(
						(n) =>
							!n.done && !n.held && n.lane === l && Math.abs(n.y - HZ) < 35,
					);
					if (!isHolding && bad) {
						bad.done = true;
						state.combo = 0;
						state.missCount++;
						state.score = Math.max(0, state.score - 1);
						locals.status = "Bad!";
						locals.statusTimer = 50;
					}
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
