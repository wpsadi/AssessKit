import { FloatingThemeToggle } from "@/components/floating-theme-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/react";
interface PropTypes {
	children?: React.ReactNode;
}

function Providers({ children }: PropTypes) {
	return (
		<>
			<TRPCReactProvider>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<FloatingThemeToggle />
					{children}
				</ThemeProvider>

				<Toaster />
			</TRPCReactProvider>
		</>
	);
}

export default Providers;
