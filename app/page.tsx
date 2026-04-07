"use client";

import { useEffect, useRef } from "react";

type Note = {
	lane: number;
	y: number;
	hold: number;
	held: boolean;
	done: boolean;
};

export default function Page() {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current as HTMLCanvasElement;
		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
		const W = 220,
			H = 400,
			HZ = 280,
			TH = 6,
			NW = 45,
			TW = 12;
		canvas.width = W;
		canvas.height = H;

		let notes: Note[] = [];
		const keys = [false, false];
		const pulse = [0, 0];
		let score = 0;
		let spawn = 0;
		let status = "";
		let statusTimer = 0;

		const spawnNote = () => {
			notes.push({
				lane: Math.random() < 0.5 ? 0 : 1,
				y: Math.random() < 0.3 ? -(50 + Math.random() * 70) : -TH,
				hold: Math.random() < 0.3 ? 50 + Math.random() * 70 : 0,
				held: false,
				done: false,
			});
		};

		const setStatus = (s: string) => {
			status = s;
			statusTimer = 50;
		};

		const loop = () => {
			ctx.fillStyle = "#181818";
			ctx.fillRect(0, 0, W, H);

			if (pulse[0] > 0) {
				pulse[0]--;
				ctx.fillStyle = `rgba(60,180,60,${(pulse[0] / 15) * 0.3})`;
				ctx.fillRect(40, HZ - 20, NW + 10, 40);
			}
			if (pulse[1] > 0) {
				pulse[1]--;
				ctx.fillStyle = `rgba(60,180,60,${(pulse[1] / 15) * 0.3})`;
				ctx.fillRect(125, HZ - 20, NW + 10, 40);
			}

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

			if (statusTimer > 0) {
				statusTimer--;
				ctx.font = "italic 12px serif";
				ctx.fillStyle = "#ddd";
				ctx.fillText(status, W - 15, HZ - 12);
			}
			ctx.textAlign = "left";

			spawn++;
			if (spawn > 45) {
				spawnNote();
				spawn = 0;
			}

			for (const n of notes) {
				if (n.done) continue;
				n.y += 3;

				const x = n.lane === 0 ? 45 : 135;

				if (n.hold > 0) {
					const tailX = x + NW / 2 - TW / 2;
					const headY = n.y + n.hold;
					ctx.fillStyle = "rgba(70,170,70,0.4)";
					ctx.fillRect(tailX, n.y, TW, n.hold);
					if (n.held) {
						const litTop = Math.max(n.y, HZ);
						const litH = headY - litTop;
						if (litH > 0) {
							ctx.fillStyle = "rgb(70,180,70)";
							ctx.fillRect(tailX, litTop, TW, litH);
						}
					}
					ctx.fillStyle = "rgb(70,180,70)";
					ctx.fillRect(x, headY, NW, TH);
				} else {
					ctx.fillStyle = "rgb(70,180,70)";
					ctx.fillRect(x, n.y, NW, TH);
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
						score++;
						setStatus("Marvelous!");
					}
					if (n.y > HZ + 25) {
						n.done = true;
						setStatus("Miss!");
					}
				} else {
					if (inZone && key) {
						const diff = Math.abs(n.y + TH / 2 - HZ);
						if (diff < 8) {
							score++;
							setStatus("Marvelous!");
						} else if (diff < 20) {
							score++;
							setStatus("Cool!");
						} else {
							setStatus("Meh");
						}
						n.done = true;
					}
					if (n.y > HZ + 25) {
						n.done = true;
						setStatus("Miss!");
					}
				}
			}

			notes = notes.filter((n) => !n.done || n.y < H);
			requestAnimationFrame(loop);
		};

		const down = (e: KeyboardEvent) => {
			if (e.key === "a" || e.key === "A") {
				keys[0] = true;
				pulse[0] = 15;
			}
			if (e.key === "d" || e.key === "D") {
				keys[1] = true;
				pulse[1] = 15;
			}
		};
		const up = (e: KeyboardEvent) => {
			if (e.key === "a" || e.key === "A") keys[0] = false;
			if (e.key === "d" || e.key === "D") keys[1] = false;
		};

		window.addEventListener("keydown", down);
		window.addEventListener("keyup", up);
		loop();

		return () => {
			window.removeEventListener("keydown", down);
			window.removeEventListener("keyup", up);
		};
	}, []);

	return (
		<main className="min-h-screen bg-black flex items-center justify-center">
			<canvas ref={ref} />
		</main>
	);
}
