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

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/test") {
			try {
				const image1Response = await env.ASSETS.fetch("/test/background.png");
				const image2Response = await env.ASSETS.fetch("/test/body.png");
				const image3Response = await env.ASSETS.fetch("/test/head.png");

				if (!image1Response.ok || !image2Response.ok || !image3Response.ok) {
					throw new Error("Failed to fetch images from ASSETS");
				}

				const [img1Buf, img2Buf, img3Buf] = await Promise.all([
					image1Response.arrayBuffer(),
					image2Response.arrayBuffer(),
					image3Response.arrayBuffer(),
				]);

				const png1 = UPNG.decode(img1Buf);
				const png2 = UPNG.decode(img2Buf);
				const png3 = UPNG.decode(img3Buf);

				const rgba1 = UPNG.toRGBA8(png1)[0];
				const rgba2 = UPNG.toRGBA8(png2)[0];
				const rgba3 = UPNG.toRGBA8(png3)[0];

				const width = png1.width;
				const height = png1.height;

				if (
					png2.width !== width || png2.height !== height ||
					png3.width !== width || png3.height !== height
				) {
					throw new Error(
						"Images have different sizes - implement resize/offset logic.",
					);
				}

				const composite = new Uint8Array(rgba1);

				for (let i = 0; i < composite.length; i += 4) {
					const bgR = composite[i + 0];
					const bgG = composite[i + 1];
					const bgB = composite[i + 2];
					const bgA = composite[i + 3];

					const fgR = (rgba2 as any)[i + 0];
					const fgG = (rgba2 as any)[i + 1];
					const fgB = (rgba2 as any)[i + 2];
					const fgA = (rgba2 as any)[i + 3];

					const [r, g, b, a] = blendPixel(
						bgR,
						bgG,
						bgB,
						bgA,
						fgR,
						fgG,
						fgB,
						fgA,
					);

					const fgR2 = (rgba3 as any)[i + 0];
					const fgG2 = (rgba3 as any)[i + 1];
					const fgB2 = (rgba3 as any)[i + 2];
					const fgA2 = (rgba3 as any)[i + 3];
					const [r2, g2, b2, a2] = blendPixel(
						r,
						g,
						b,
						a,
						fgR2,
						fgG2,
						fgB2,
						fgA2,
					);

					composite[i + 0] = r2;
					composite[i + 1] = g2;
					composite[i + 2] = b2;
					composite[i + 3] = a2;
				}

				const outBuffer = UPNG.encode([composite.buffer], width, height, 8);

				await env.GOD_IMAGES_BUCKET.put("test.png", outBuffer);

				return new Response("ok", { status: 200 });
			} catch (error) {
				console.error("Error processing images:", error);
				return new Response("Internal Server Error", { status: 500 });
			}
		}

		if (url.pathname === "/set-gaia-name") {
		}

		return new Response(JSON.stringify({ name: "Cloudflare" }), {
			headers: { "Content-Type": "application/json" },
		});
	},
} satisfies ExportedHandler<Env>;
