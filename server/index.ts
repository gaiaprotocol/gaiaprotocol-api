export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		return new Response(JSON.stringify({ name: "Cloudflare" }), {
			headers: { "Content-Type": "application/json" },
		});
	},
} satisfies ExportedHandler<Env>;
