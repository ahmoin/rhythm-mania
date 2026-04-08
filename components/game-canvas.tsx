"use client";
import { useRef } from "react";
import { useGameLoop } from "@/hooks/use-game-loop";

export default function GameCanvas() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	useGameLoop(canvasRef, fileRef);

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
			<input
				ref={fileRef}
				type="file"
				accept=".osz"
				style={{ display: "none" }}
			/>
		</>
	);
}
