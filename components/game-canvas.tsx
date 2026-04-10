"use client";
import { useRef } from "react";
import { useGameLoop } from "@/hooks/use-game-loop";

export default function GameCanvas() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);
	const flashRef = useRef<HTMLDivElement>(null);

	useGameLoop(canvasRef, fileRef, flashRef);

	return (
		<>
			<canvas
				ref={canvasRef}
				style={{
					height: "100vh",
					width: "auto",
					display: "block",
					imageRendering: "pixelated",
				}}
			/>
			<div
				ref={flashRef}
				style={{
					position: "fixed",
					inset: 0,
					backgroundColor: "#fff",
					opacity: 0,
					pointerEvents: "none",
				}}
			/>
			<input
				ref={fileRef}
				type="file"
				accept=".osz"
				style={{ display: "none" }}
			/>
		</>
	);
}
