let audioCtx: AudioContext | null = null;

function ac(): AudioContext {
	if (!audioCtx) audioCtx = new AudioContext();
	return audioCtx;
}

export function playKick() {
	const ctx = ac();
	const t = ctx.currentTime;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.connect(gain);
	gain.connect(ctx.destination);
	osc.type = "sine";
	osc.frequency.setValueAtTime(150, t);
	osc.frequency.exponentialRampToValueAtTime(0.001, t + 0.4);
	gain.gain.setValueAtTime(1.5, t);
	gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
	osc.start(t);
	osc.stop(t + 0.4);
}

export function playSnare() {
	const ctx = ac();
	const t = ctx.currentTime;
	const bufSize = Math.floor(ctx.sampleRate * 0.2);
	const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
	const data = buf.getChannelData(0);
	for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
	const src = ctx.createBufferSource();
	src.buffer = buf;
	const gain = ctx.createGain();
	src.connect(gain);
	gain.connect(ctx.destination);
	gain.gain.setValueAtTime(0.5, t);
	gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
	src.start(t);
	src.stop(t + 0.2);
}

export function playTick() {
	const ctx = ac();
	const t = ctx.currentTime;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.connect(gain);
	gain.connect(ctx.destination);
	osc.frequency.value = 1000;
	gain.gain.setValueAtTime(0.06, t);
	gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
	osc.start(t);
	osc.stop(t + 0.03);
}
