import JSZip from "jszip";
import { parseOsu } from "@/lib/osu-parser";

export async function fetchZip(source: File | string): Promise<JSZip> {
	if (typeof source === "string") {
		const res = await fetch(source);
		if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
		return await JSZip.loadAsync(await res.arrayBuffer());
	}
	return await JSZip.loadAsync(source);
}

export async function getDifficulties(z: JSZip) {
	const osuFiles = Object.keys(z.files).filter(
		(k) => k.endsWith(".osu") && !z.files[k].dir,
	);

	if (osuFiles.length === 0) throw new Error("No .osu file found");

	const diffs = await Promise.all(
		osuFiles.map(async (f) => {
			const c = await z.files[f].async("string");
			const match = c.match(/^Version:(.+)$/m);
			return { name: match ? match[1].trim() : f, file: f };
		}),
	);

	return { osuFiles, diffs };
}

export async function prepareSongData(z: JSZip, filename: string) {
	const content = await z.files[filename].async("string");
	const { chart, audioFilename } = parseOsu(content);

	const versionMatch = content.match(/^Version:(.+)$/m);
	const diffName = versionMatch ? versionMatch[1].trim() : filename;

	const audioKey = Object.keys(z.files).find(
		(k) => k.toLowerCase() === audioFilename.toLowerCase(),
	);

	if (!audioKey) throw new Error(`Audio "${audioFilename}" not found`);

	const audioBlob = await z.files[audioKey].async("blob");

	return {
		chart,
		diffName,
		audioBlob,
	};
}
