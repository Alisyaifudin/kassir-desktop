import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async ({ command, mode }) => {
	const isDev = command === "serve" || mode === "development";
	return {
		plugins: [
			react(),
			tailwindcss(),
			tsconfigPaths(),
			{
				name: "inject-react-scan",
				transformIndexHtml(html) {
					if (isDev) {
						return html.replace(
							"</head>",
							'<script crossOrigin="anonymous" src="//unpkg.com/react-scan/dist/auto.global.js"></script></head>'
						);
					}
					return html;
				},
			},
		],
		base: "./",

		// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
		//
		// 1. prevent vite from obscuring rust errors
		clearScreen: false,
		// 2. tauri expects a fixed port, fail if that port is not available
		server: {
			port: 1420,
			strictPort: true,
			host: host || false,
			hmr: host
				? {
						protocol: "ws",
						host,
						port: 1421,
				  }
				: undefined,
			watch: {
				// 3. tell vite to ignore watching `src-tauri`
				ignored: ["**/src-tauri/**"],
			},
		},
	};
});
