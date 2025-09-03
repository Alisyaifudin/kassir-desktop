import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
	title: "Kassir",
	tagline: "Aplikasi untuk mencatat pengeluaran/pemasukan toko",
	favicon: "img/favicon.ico",

	// Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
	future: {
		v4: true, // Improve compatibility with the upcoming Docusaurus v4
	},

	// Set the production url of your site here
	url: "https://your-docusaurus-site.example.com",
	// Set the /<baseUrl>/ pathname under which your site is served
	// For GitHub pages deployment, it is often '/<projectName>/'
	baseUrl: "/kassir-desktop/",

	// GitHub pages deployment config.
	// If you aren't using GitHub pages, you don't need these.
	// organizationName: "facebook", // Usually your GitHub org/user name.
	// projectName: "docusaurus", // Usually your repo name.

	onBrokenLinks: "throw",
	onBrokenMarkdownLinks: "warn",

	// Even if you don't use internationalization, you can use this field to set
	// useful metadata like html lang. For example, if your site is Chinese, you
	// may want to replace "en" with "zh-Hans".
	i18n: {
		defaultLocale: "id",
		locales: ["id"],
	},
	plugins: ["./src/plugins/tailwind-config.js"],

	presets: [
		[
			"classic",
			{
				docs: {
					sidebarPath: "./sidebars.ts",
					// Please change this to your repo.
					// Remove this to remove the "edit this page" links.
					// editUrl:
					// 	"https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/",
				},
				blog: {
					showReadingTime: true,
					feedOptions: {
						type: ["rss", "atom"],
						xslt: true,
					},
					// Please change this to your repo.
					// Remove this to remove the "edit this page" links.
					// editUrl:
					// 	"https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/",
					// Useful options to enforce blogging best practices
					onInlineTags: "warn",
					onInlineAuthors: "warn",
					onUntruncatedBlogPosts: "warn",
				},
				theme: {
					customCss: "./src/css/custom.css",
				},
			} satisfies Preset.Options,
		],
	],

	themeConfig: {
		// Replace with your project's social card
		navbar: {
			title: "Kassir",
			logo: {
				alt: "Kassir Logo",
				src: "img/logo.svg",
			},
			items: [
				{
					type: "docSidebar",
					sidebarId: "tutorialSidebar",
					position: "left",
					label: "Dokumentasi",
				},
				{ to: "/blog", label: "Blog", position: "left" },
				{
					href: "https://github.com/Alisyaifudin/kassir-desktop",
					label: "GitHub",
					position: "right",
				},
			],
		},
		footer: {
			style: "dark",
			links: [
				{
					title: "Halaman",
					items: [
						{
							label: "Dokumentasi",
							to: "/docs/intro",
						},
						{
							label: "Blog",
							to: "/docs/intro",
						},
					],
				},
				{
					title: "Kontak",
					items: [
						{
							label: "Facebook",
							href: "https://facebook.com/alisyaifudin2",
						},
						{
							label: "Twitter",
							href: "https://x.com/alisyaifudin18",
						},
						{
							label: "Email",
							href: "mailto:syaifudin.ali.muhammad@gmail.com",
						},
					],
				},
				{
					title: "Lainnya",
					items: [
						{
							label: "GitHub",
							href: "https://github.com/Alisyaifudin/kassir-desktop",
						},
					],
				},
			],
			copyright: `© ${new Date().getFullYear()} Muhammad Ali Syaifudin. Dibuat dengan <a href="https://docusaurus.io/">Docusaurus</a> ❤️.`,
		},
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
