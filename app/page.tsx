import GameCanvas from "@/components/game-canvas";

export default function Page() {
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
			<GameCanvas />
		</main>
	);
}
