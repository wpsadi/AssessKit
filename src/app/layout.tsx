import "@/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { WebsiteNoticeDialog } from "@/components/alert-dialog-website";
import Footer from "@/components/simple-footer";
import Providers from "./providers";

export const metadata: Metadata = {
	title: "AssessKit",
	description:
		"AssessKit is a lightweight, headless quiz engine designed for secure, structured, and timed assessments. It gives you full control over content, flow, and scoring logic — while exposing just a few clean API endpoints.",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`${geist.variable}`}>
			<body>
				<WebsiteNoticeDialog />
				<Providers>{children}</Providers>
				{/* <Footer /> */}
			</body>
		</html>
	);
}
