import { Resvg } from "@cf-wasm/resvg";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	let binary = "";
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
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

				const [bgB64, bodyB64, headB64] = await Promise.all(
					[respBg, respBody, respHead].map(async (r) => {
						const buf = await r.arrayBuffer();
						return arrayBufferToBase64(buf);
					}),
				);

				const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <image href="data:image/png;base64,${bgB64}" x="0" y="0" width="1024" height="1024" />
  <image href="data:image/png;base64,${bodyB64}" x="0" y="0" width="1024" height="1024" />
  <image href="data:image/png;base64,${headB64}" x="0" y="0" width="1024" height="1024" />
</svg>
				`.trim();

				const resvg = new Resvg(
					svg,
					{ fitTo: { mode: "width", value: 1024 } },
				);
				const png = resvg.render().asPng();

				await env.GOD_IMAGES_BUCKET.put("test.png", png);

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
