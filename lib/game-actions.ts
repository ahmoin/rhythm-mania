import type JSZip from "jszip";
import { fetchZip, getDifficulties, prepareSongData } from "@/lib/song-loader";
import type { GameStateRefs } from "@/lib/types";

export async function loadFromZip(
	state: GameStateRefs,
	z: JSZip,
	filename: string,
) {
	try {
		const { chart, diffName, audioBlob } = await prepareSongData(z, filename);

		state.selectedDiff = diffName;
		state.chart = chart;
		state.totalNotes = chart.length;

		if (state.revokeUrl) URL.revokeObjectURL(state.revokeUrl);
		state.revokeUrl = URL.createObjectURL(audioBlob);

		if (state.audio) state.audio.pause();
		state.audio = new Audio(state.revokeUrl);

		state.audio.addEventListener("ended", () => {
			if (state.phase === "game") state.phase = "results";
		});

		state.resetGameState();
		state.phase = "game";
	} catch (e) {
		state.errorMsg = e instanceof Error ? e.message : String(e);
		state.phase = "menu";
	}
}

export async function loadStoryLevel(
	state: GameStateRefs,
	path: string,
	diffIndex: number,
) {
	state.phase = "loading";
	state.errorMsg = "";
	try {
		const z = await fetchZip(path);
		const { osuFiles } = await getDifficulties(z);
		const filename = osuFiles[Math.min(diffIndex, osuFiles.length - 1)];
		await loadFromZip(state, z, filename);
	} catch (e) {
		state.errorMsg = e instanceof Error ? e.message : String(e);
		state.phase = "story-select";
	}
}

export async function loadOsz(state: GameStateRefs, source: File | string) {
	state.phase = "loading";
	state.errorMsg = "";
	try {
		const z = await fetchZip(source);
		const { osuFiles, diffs } = await getDifficulties(z);

		if (osuFiles.length === 1) {
			await loadFromZip(state, z, osuFiles[0]);
		} else {
			state.currentZip = z;
			state.difficulties = diffs;
			state.phase = "difficulty";
		}
	} catch (e) {
		state.errorMsg = e instanceof Error ? e.message : String(e);
		state.phase = "menu";
	}
}
