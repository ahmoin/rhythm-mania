"use client";

import JSZip from "jszip";
import { useEffect, useRef } from "react";

type Note = {
	lane: number;
	y: number;
	hold: number;
	held: boolean;
	done: boolean;
};

type HitEffect = {
	lane: number;
	t: number;
	y: number;
};

type ChartNote = { time: number; lane: number; hold: number };

const SONG_FILES = [
	"62004 Adele - Skyfall.osz",
	"357777 NOMA - Brain Power.osz",
	"1034041 James Landino - Spellbound.osz",
	"1168718 Don Toliver - No Idea.osz",
];

function parseOsu(content: string): {
	chart: ChartNote[];
	audioFilename: string;
} {
	const lines = content.split(/\r?\n/);
	let section = "";
	let audioFilename = "";
	const chart: ChartNote[] = [];
	for (const raw of lines) {
		const line = raw.trim();
		if (!line || line.startsWith("//")) continue;
		if (line.startsWith("[")) {
			section = line;
			continue;
		}
		if (section === "[General]" && line.startsWith("AudioFilename:"))
			audioFilename = line.slice("AudioFilename:".length).trim();
		if (section === "[HitObjects]") {
			const p = line.split(",");
			if (p.length < 5) continue;
			const x = parseInt(p[0], 10),
				timeMs = parseInt(p[2], 10),
				type = parseInt(p[3], 10);
			if (Number.isNaN(x) || Number.isNaN(timeMs) || Number.isNaN(type))
				continue;
			if (type & 8) continue;
			const lane = x >= 256 ? 1 : 0;
			let hold = 0;
			if (type & 128 && p.length > 5) {
				const endMs = parseInt(p[5].split(":")[0], 10);
				if (!Number.isNaN(endMs)) hold = (endMs - timeMs) / 1000;
			}
			chart.push({ time: timeMs / 1000, lane, hold });
		}
	}
	chart.sort((a, b) => a.time - b.time);
	return { chart, audioFilename };
}

export default function Page() {
	const ref = useRef<HTMLCanvasElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const canvas = ref.current as HTMLCanvasElement;
		const fileInput = fileRef.current as HTMLInputElement;
		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
		const W = 220,
			H = 400,
			HZ = 280,
			TH = 6,
			NW = 45,
			TW = 12;
		const SCALE = window.innerHeight / H;
		canvas.width = Math.round(W * SCALE);
		canvas.height = Math.round(H * SCALE);

		const sprite = new Image();
		sprite.src = "/beat-indicator-template.png";
		const outlineSprite = new Image();
		outlineSprite.src = "/beat-indicator-template-outline.png";

		const SPEED = 90;
		const SCROLL_TIME = H / SPEED;

		type Phase = "menu" | "loading" | "difficulty" | "game" | "results";
		let phase: Phase = "menu";
		let mouseX = 0,
			mouseY = 0;
		let errorMsg = "";

		type SongMeta = { name: string; path: string };
		const songMetas: SongMeta[] = SONG_FILES.map((f) => ({
			name: f.replace(/^\d+\s+/, "").replace(/\.osz$/i, ""),
			path: `/songs/${f}`,
		}));

		let difficulties: { name: string; file: string }[] = [];
		let currentZip: JSZip | null = null;
		let revokeUrl = "";
		type Btn = {
			x: number;
			y: number;
			w: number;
			h: number;
			action: () => void;
		};
		let buttons: Btn[] = [];

		let audio: HTMLAudioElement | null = null;
		let chart: ChartNote[] = [];
		let chartIdx = 0;
		let started = false;
		let totalNotes = 0;

		let selectedSong = "";
		let selectedDiff = "";

		let notes: Note[] = [];
		const keys = [false, false];
		let hitEffects: HitEffect[] = [];
		let score = 0;
		let perfectCount = 0,
			greatCount = 0,
			okayCount = 0,
			missCount = 0;
		let combo = 0,
			maxCombo = 0;
		let status = "";
		let statusTimer = 0;

		const setStatus = (s: string) => {
			status = s;
			statusTimer = 50;
		};

		const recordHit = (judgement: "perfect" | "great" | "okay" | "miss") => {
			if (judgement === "perfect") {
				perfectCount++;
				score++;
				combo++;
				setStatus("Perfect");
			} else if (judgement === "great") {
				greatCount++;
				score++;
				combo++;
				setStatus("Great");
			} else if (judgement === "okay") {
				okayCount++;
				combo = 0;
				setStatus("Okay");
			} else {
				missCount++;
				combo = 0;
				setStatus("Miss!");
			}
			if (combo > maxCombo) maxCombo = combo;
		};

		async function loadFromZip(z: JSZip, filename: string) {
			const content = await z.files[filename].async("string");
			const { chart: parsed, audioFilename } = parseOsu(content);
			const versionMatch = content.match(/^Version:(.+)$/m);
			selectedDiff = versionMatch ? versionMatch[1].trim() : filename;
			const audioKey = Object.keys(z.files).find(
				(k) => k.toLowerCase() === audioFilename.toLowerCase(),
			);
			if (!audioKey) throw new Error(`Audio "${audioFilename}" not found`);
			const blob = await z.files[audioKey].async("blob");
			if (revokeUrl) URL.revokeObjectURL(revokeUrl);
			revokeUrl = URL.createObjectURL(blob);
			if (audio) audio.pause();
			audio = new Audio(revokeUrl);
			audio.addEventListener("ended", () => {
				if (phase === "game") phase = "results";
			});
			chart = parsed;
			totalNotes = chart.length;
			chartIdx = 0;
			notes = [];
			keys[0] = false;
			keys[1] = false;
			hitEffects = [];
			score = 0;
			perfectCount = 0;
			greatCount = 0;
			okayCount = 0;
			missCount = 0;
			combo = 0;
			maxCombo = 0;
			status = "";
			statusTimer = 0;
			started = false;
			phase = "game";
		}

		async function loadOsz(source: File | string) {
			phase = "loading";
			errorMsg = "";
			try {
				let z: JSZip;
				if (typeof source === "string") {
					const res = await fetch(source);
					if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
					z = await JSZip.loadAsync(await res.arrayBuffer());
				} else {
					z = await JSZip.loadAsync(source);
				}
				const osuFiles = Object.keys(z.files).filter(
					(k) => k.endsWith(".osu") && !z.files[k].dir,
				);
				if (osuFiles.length === 0) throw new Error("No .osu file found");
				if (osuFiles.length === 1) {
					await loadFromZip(z, osuFiles[0]);
				} else {
					const diffs = await Promise.all(
						osuFiles.map(async (f) => {
							const c = await z.files[f].async("string");
							const match = c.match(/^Version:(.+)$/m);
							return { name: match ? match[1].trim() : f, file: f };
						}),
					);
					currentZip = z;
					difficulties = diffs;
					phase = "difficulty";
				}
			} catch (e) {
				errorMsg = e instanceof Error ? e.message : String(e);
				phase = "menu";
			}
		}

		function hot(x: number, y: number, w: number, h: number) {
			return mouseX >= x && mouseX < x + w && mouseY >= y && mouseY < y + h;
		}

		function drawBtn(
			x: number,
			y: number,
			w: number,
			h: number,
			label: string,
			action: () => void,
		) {
			const isHot = hot(x, y, w, h);
			ctx.fillStyle = isHot ? "#2a4a2a" : "#1a2a1a";
			ctx.strokeStyle = "#5a5";
			ctx.lineWidth = 1;
			ctx.fillRect(x, y, w, h);
			ctx.strokeRect(x, y, w, h);
			ctx.fillStyle = isHot ? "#fff" : "#aaa";
			ctx.font = "9px monospace";
			ctx.textAlign = "center";
			ctx.fillText(label, x + w / 2, y + h / 2 + 4);
			ctx.textAlign = "left";
			buttons.push({ x, y, w, h, action });
		}

		function drawMenu() {
			ctx.fillStyle = "#181818";
			ctx.fillRect(0, 0, W, H);
			ctx.fillStyle = "#5a5";
			ctx.font = "bold 18px monospace";
			ctx.textAlign = "center";
			ctx.fillText("rhythm mania", W / 2, 30);
			ctx.fillStyle = "#555";
			ctx.font = "9px monospace";
			ctx.fillText("select a song", W / 2, 46);
			ctx.textAlign = "left";

			let y = 60;
			for (const song of songMetas) {
				const isHot = hot(15, y, W - 30, 36);
				ctx.fillStyle = isHot ? "#1f2f1f" : "#161616";
				ctx.strokeStyle = isHot ? "#5a5" : "#333";
				ctx.lineWidth = 1;
				ctx.fillRect(15, y, W - 30, 36);
				ctx.strokeRect(15, y, W - 30, 36);
				ctx.fillStyle = isHot ? "#fff" : "#ddd";
				ctx.font = "bold 11px monospace";
				ctx.fillText(song.name, 22, y + 22);
				const { name, path } = song;
				buttons.push({
					x: 15,
					y,
					w: W - 30,
					h: 36,
					action: () => {
						selectedSong = name;
						loadOsz(path);
					},
				});
				y += 44;
			}

			if (errorMsg) {
				ctx.fillStyle = "#f55";
				ctx.font = "8px monospace";
				ctx.textAlign = "center";
				ctx.fillText(errorMsg, W / 2, H - 46);
				ctx.textAlign = "left";
			}

			drawBtn(15, H - 30, W - 30, 20, "custom song (.osz)", () =>
				fileInput.click(),
			);
		}

		function drawLoading() {
			ctx.fillStyle = "#181818";
			ctx.fillRect(0, 0, W, H);
			ctx.fillStyle = "#aaa";
			ctx.font = "12px monospace";
			ctx.textAlign = "center";
			ctx.fillText("loading...", W / 2, H / 2);
			ctx.textAlign = "left";
		}

		function drawDifficulty() {
			ctx.fillStyle = "#181818";
			ctx.fillRect(0, 0, W, H);
			ctx.fillStyle = "#5a5";
			ctx.font = "bold 13px monospace";
			ctx.textAlign = "center";
			ctx.fillText("select difficulty", W / 2, 28);
			ctx.textAlign = "left";
			let y = 50;
			for (const d of difficulties) {
				drawBtn(15, y, W - 30, 24, d.name, async () => {
					if (!currentZip) return;
					phase = "loading";
					try {
						await loadFromZip(currentZip, d.file);
					} catch (e) {
						errorMsg = e instanceof Error ? e.message : String(e);
						phase = "menu";
					}
				});
				y += 32;
			}
			drawBtn(15, H - 30, 50, 20, "<- back", () => {
				phase = "menu";
				difficulties = [];
			});
		}

		function drawResults() {
			ctx.fillStyle = "#181818";
			ctx.fillRect(0, 0, W, H);

			ctx.fillStyle = "#5a5";
			ctx.font = "bold 16px monospace";
			ctx.textAlign = "center";
			ctx.fillText("results", W / 2, 24);

			ctx.font = "bold 9px monospace";
			ctx.fillStyle = "#ddd";
			const maxW = W - 20;
			ctx.save();
			ctx.beginPath();
			ctx.rect(10, 28, maxW, 22);
			ctx.clip();
			ctx.fillText(selectedSong, W / 2, 38);
			ctx.restore();
			ctx.fillStyle = "#888";
			ctx.font = "8px monospace";
			ctx.fillText(selectedDiff, W / 2, 50);

			ctx.strokeStyle = "#333";
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(15, 56);
			ctx.lineTo(W - 15, 56);
			ctx.stroke();

			ctx.fillStyle = "#fff";
			ctx.font = "bold 28px monospace";
			ctx.fillText(`${score}`, W / 2, 84);
			ctx.fillStyle = "#555";
			ctx.font = "9px monospace";
			ctx.fillText("score", W / 2, 96);

			const accuracy =
				totalNotes === 0
					? 100
					: ((perfectCount * 3 + greatCount * 2 + okayCount) /
							(totalNotes * 3)) *
						100;
			ctx.textAlign = "left";
			ctx.fillStyle = "#aaa";
			ctx.font = "bold 11px monospace";
			ctx.fillText(`${accuracy.toFixed(2)}%`, 20, 118);
			ctx.textAlign = "right";
			ctx.fillText(`${maxCombo}x`, W - 20, 118);
			ctx.fillStyle = "#555";
			ctx.font = "8px monospace";
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
				["Perfect", perfectCount, "#ffe066"],
				["Great", greatCount, "#66aaff"],
				["Okay", okayCount, "#aaa"],
				["Miss", missCount, "#f55"],
			];
			let ry = 150;
			for (const [label, count, color] of rows) {
				ctx.textAlign = "left";
				ctx.fillStyle = color;
				ctx.font = "bold 10px monospace";
				ctx.fillText(label, 30, ry);
				ctx.textAlign = "right";
				ctx.fillStyle = "#ddd";
				ctx.fillText(`${count}`, W - 30, ry);
				ry += 18;
			}

			ctx.textAlign = "left";
			drawBtn(15, H - 30, W - 30, 20, "back to menu", () => {
				phase = "menu";
			});
		}

		const loop = () => {
			ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

			buttons = [];

			if (phase === "menu") {
				drawMenu();
				requestAnimationFrame(loop);
				return;
			}
			if (phase === "loading") {
				drawLoading();
				requestAnimationFrame(loop);
				return;
			}
			if (phase === "difficulty") {
				drawDifficulty();
				requestAnimationFrame(loop);
				return;
			}
			if (phase === "results") {
				drawResults();
				requestAnimationFrame(loop);
				return;
			}

			ctx.fillStyle = "#181818";
			ctx.fillRect(0, 0, W, H);

			if (!started) {
				ctx.fillStyle = "#fff";
				ctx.font = "bold 16px monospace";
				ctx.textAlign = "center";
				ctx.fillText("press any key to start", W / 2, H / 2);
				ctx.textAlign = "left";
				requestAnimationFrame(loop);
				return;
			}

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
			ctx.lineWidth = 1;

			ctx.fillStyle = "#aaa";
			ctx.font = "14px monospace";
			ctx.fillText("A", 58, HZ + 20);
			ctx.fillText("D", 148, HZ + 20);

			ctx.fillStyle = "#fff";
			ctx.font = "bold 20px monospace";
			ctx.textAlign = "right";
			ctx.fillText(`${score}`, W - 15, HZ - 30);

			if (combo > 1) {
				ctx.fillStyle = "#5a5";
				ctx.font = "bold 11px monospace";
				ctx.textAlign = "left";
				ctx.fillText(`${combo}x`, 15, HZ - 30);
			}

			if (statusTimer > 0) {
				statusTimer--;
				ctx.font = "italic 12px serif";
				ctx.fillStyle = "#ddd";
				ctx.textAlign = "right";
				ctx.fillText(status, W - 15, HZ - 12);
			}
			ctx.textAlign = "left";

			const now = audio?.currentTime ?? 0;
			while (
				chartIdx < chart.length &&
				chart[chartIdx].time - now <= SCROLL_TIME
			) {
				const cn = chart[chartIdx++];
				notes.push({
					lane: cn.lane,
					y: HZ - (cn.time - now) * SPEED,
					hold: cn.hold * SPEED,
					held: false,
					done: false,
				});
			}

			for (const n of notes) {
				if (n.done || n.y > H + 20) continue;
				n.y += SPEED / 60;

				const x = n.lane === 0 ? 45 : 135;

				const drawSprite = (sx: number, sy: number, sw: number, sh: number) => {
					ctx.drawImage(sprite, sx, sy, sw, sh);
					ctx.save();
					ctx.globalCompositeOperation = "source-atop";
					ctx.fillStyle = "#55b33b";
					ctx.fillRect(sx, sy, sw, sh);
					ctx.restore();
				};

				if (n.hold > 0) {
					const tailX = x + NW / 2 - TW / 2;
					const headY = n.y + n.hold;
					ctx.fillStyle = "rgba(85,179,59,0.4)";
					ctx.fillRect(tailX, n.y, TW, n.hold);
					if (n.held) {
						const litTop = Math.max(n.y, HZ);
						const litH = headY - litTop;
						if (litH > 0) {
							drawSprite(tailX, litTop, TW, litH);
						}
					}
					drawSprite(x, headY, NW, TH);
				} else {
					drawSprite(x, n.y, NW, TH);
				}

				const noteEnd = n.hold > 0 ? n.y + n.hold + TH : n.y + TH;
				const inZone = noteEnd > HZ - 35 && n.y < HZ + 25;
				const key = keys[n.lane];

				if (n.hold > 0) {
					const headY = n.y + n.hold;
					if (inZone && key && !n.held && headY > HZ - 25 && headY < HZ + 25)
						n.held = true;
					if (n.held && !key && n.y > HZ - 10) {
						n.done = true;
						hitEffects.push({ lane: n.lane, t: 15, y: n.y + n.hold });
						recordHit("perfect");
					}
					if (n.y > HZ + 25) {
						n.done = true;
						recordHit("miss");
					}
				} else {
					if (n.y > HZ + 25) {
						n.done = true;
						recordHit("miss");
					}
				}
			}

			notes = notes.filter((n) => !n.done && n.y < H + 20);

			if (
				started &&
				chartIdx >= chart.length &&
				notes.length === 0 &&
				audio?.ended
			) {
				phase = "results";
			}

			requestAnimationFrame(loop);
		};

		const hitLane = (lane: number) => {
			let closest: Note | null = null;
			let closestDist = Infinity;
			for (const n of notes) {
				if (n.done || n.hold > 0 || n.lane !== lane) continue;
				const dist = Math.abs(n.y + TH / 2 - HZ);
				if (dist < 35 && dist < closestDist) {
					closestDist = dist;
					closest = n;
				}
			}
			if (!closest) return;
			closest.done = true;
			hitEffects.push({ lane, t: 15, y: closest.y + TH / 2 });
			if (closestDist < 8) {
				recordHit("perfect");
			} else if (closestDist < 20) {
				recordHit("great");
			} else {
				recordHit("okay");
			}
		};

		const down = (e: KeyboardEvent) => {
			if (phase !== "game") return;
			if (!started) {
				started = true;
				audio?.play();
				return;
			}
			if (e.key === "a" || e.key === "A") {
				keys[0] = true;
				hitLane(0);
			}
			if (e.key === "d" || e.key === "D") {
				keys[1] = true;
				hitLane(1);
			}
		};
		const up = (e: KeyboardEvent) => {
			if (e.key === "a" || e.key === "A") keys[0] = false;
			if (e.key === "d" || e.key === "D") keys[1] = false;
		};

		function canvasPos(e: MouseEvent) {
			const r = canvas.getBoundingClientRect();
			return {
				x: (e.clientX - r.left) * (W / r.width),
				y: (e.clientY - r.top) * (H / r.height),
			};
		}
		const onMove = (e: MouseEvent) => {
			({ x: mouseX, y: mouseY } = canvasPos(e));
		};
		const onClick = (e: MouseEvent) => {
			const { x, y } = canvasPos(e);
			for (const b of buttons) {
				if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) {
					b.action();
					break;
				}
			}
		};

		fileInput.addEventListener("change", () => {
			const f = fileInput.files?.[0];
			if (f) {
				selectedSong = f.name.replace(/\.osz$/i, "");
				loadOsz(f);
			}
			fileInput.value = "";
		});

		window.addEventListener("keydown", down);
		window.addEventListener("keyup", up);
		canvas.addEventListener("mousemove", onMove);
		canvas.addEventListener("click", onClick);

		let loaded = 0;
		const onLoad = () => {
			if (++loaded === 2) loop();
		};
		sprite.onload = onLoad;
		outlineSprite.onload = onLoad;

		return () => {
			window.removeEventListener("keydown", down);
			window.removeEventListener("keyup", up);
			canvas.removeEventListener("mousemove", onMove);
			canvas.removeEventListener("click", onClick);
			if (audio) audio.pause();
			if (revokeUrl) URL.revokeObjectURL(revokeUrl);
		};
	}, []);

	return (
		<main
			style={{
				height: "100vh",
				width: "100vw",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "#181818",
				overflow: "hidden",
			}}
		>
			<canvas
				ref={ref}
				style={{
					height: "100vh",
					width: "auto",
					display: "block",
					imageRendering: "pixelated",
				}}
			/>
			<input
				ref={fileRef}
				type="file"
				accept=".osz"
				style={{ display: "none" }}
			/>
		</main>
	);
}
