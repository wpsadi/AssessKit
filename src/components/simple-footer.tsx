import Link from "next/link";

export default function Footer() {
	return (
		<footer className="mt-2 w-full border-t bg-background">
			<div className="container flex h-14 items-center justify-center px-4 md:px-6">
				<Link
					href="https://documenter.getpostman.com/view/30455760/2sB34co2QR"
					target="_blank"
					rel="noopener noreferrer"
					className="text-muted-foreground text-sm transition-colors hover:text-foreground hover:underline"
				>
					Docs
				</Link>
			</div>
		</footer>
	);
}
