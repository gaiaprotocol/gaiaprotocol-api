import { ImageCombiner } from "@commonmodule/image-combiner";

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

				await env.GOD_IMAGES_BUCKET.put(
					"test.png",
					ImageCombiner.combine([imgBgBuf, imgBodyBuf, imgHeadBuf]),
				);

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
