import UPNG from "upng-js";

function blendPixel(
	bgR: number,
	bgG: number,
	bgB: number,
	bgA: number,
	fgR: number,
	fgG: number,
	fgB: number,
	fgA: number,
): [number, number, number, number] {
	const alphaF = fgA / 255;
	const alphaB = bgA / 255;
	const outA = alphaF + alphaB * (1 - alphaF);
	if (outA < 1e-6) return [0, 0, 0, 0];

	const outR = Math.round((fgR * alphaF + bgR * alphaB * (1 - alphaF)) / outA);
	const outG = Math.round((fgG * alphaF + bgG * alphaB * (1 - alphaF)) / outA);
	const outB = Math.round((fgB * alphaF + bgB * alphaB * (1 - alphaF)) / outA);
	const outAlpha = Math.round(outA * 255);
	return [outR, outG, outB, outAlpha];
}

function blendImage(base: Uint8Array, overlay: Uint8Array) {
	for (let i = 0; i < base.length; i += 4) {
		const [bgR, bgG, bgB, bgA] = [
			base[i],
			base[i + 1],
			base[i + 2],
			base[i + 3],
		];
		const [fgR, fgG, fgB, fgA] = [
			overlay[i],
			overlay[i + 1],
			overlay[i + 2],
			overlay[i + 3],
		];
		const [r, g, b, a] = blendPixel(bgR, bgG, bgB, bgA, fgR, fgG, fgB, fgA);
		base[i] = r;
		base[i + 1] = g;
		base[i + 2] = b;
		base[i + 3] = a;
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/test") {
			try {
				const bgUrl = new URL("/test/background.png", request.url);
				const bodyUrl = new URL("/test/body.png", request.url);
				const headUrl = new URL("/test/head.png", request.url);

				const [respBg, respBody, respHead] = await Promise.all([
					env.ASSETS.fetch(bgUrl),
					env.ASSETS.fetch(bodyUrl),
					env.ASSETS.fetch(headUrl),
				]);
				if (!respBg.ok || !respBody.ok || !respHead.ok) {
					throw new Error("Failed to fetch images from ASSETS");
				}

				const [imgBgBuf, imgBodyBuf, imgHeadBuf] = await Promise.all([
					respBg.arrayBuffer(),
					respBody.arrayBuffer(),
					respHead.arrayBuffer(),
				]);

				const pngBg = UPNG.decode(imgBgBuf);
				const pngBody = UPNG.decode(imgBodyBuf);
				const pngHead = UPNG.decode(imgHeadBuf);

				const rgbaBg = UPNG.toRGBA8(pngBg)[0];
				const rgbaBody = UPNG.toRGBA8(pngBody)[0];
				const rgbaHead = UPNG.toRGBA8(pngHead)[0];

				const width = pngBg.width, height = pngBg.height;
				if (
					pngBody.width !== width || pngBody.height !== height ||
					pngHead.width !== width || pngHead.height !== height
				) {
					throw new Error(
						"Images have different sizes - implement resize logic if needed.",
					);
				}

				const composite = new Uint8Array(rgbaBg);

				blendImage(composite, new Uint8Array(rgbaBody));
				blendImage(composite, new Uint8Array(rgbaHead));

				const outBuffer = UPNG.encode([composite.buffer], width, height, 0);

				await env.GOD_IMAGES_BUCKET.put("test.png", outBuffer);

				return new Response("ok", { status: 200 });
			} catch (err) {
				console.error(err);
				return new Response(`Error: ${err}`, { status: 500 });
			}
		}

		if (url.pathname === "/set-gaia-name") {
		}

		return new Response(JSON.stringify({ name: "Cloudflare" }), {
			headers: { "Content-Type": "application/json" },
		});
	},
} satisfies ExportedHandler<Env>;
