import type { ChartNote } from "@/lib/types";

export function parseOsu(content: string): {
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
