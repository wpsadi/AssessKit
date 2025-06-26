import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Info } from "lucide-react";
import { GitHubLoginButton } from "./_components/github-login-button";

export default function LoginPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-md">
				<Alert className="mb-6 border-border bg-muted">
					<Info className="h-4 w-4 text-muted-foreground" />
					<AlertDescription className="text-foreground">
						<strong>Demo Mode:</strong> This application is running with mock
						data. Click "Continue with GitHub" to explore the interface without
						needing actual GitHub authentication.
					</AlertDescription>
				</Alert>

				<Card>
					<CardHeader className="text-center">
						<CardTitle className="font-bold text-2xl">Quiz Platform</CardTitle>
						<CardDescription>
							Sign in to get started (demo mode - no real authentication
							required)
						</CardDescription>
					</CardHeader>
					<CardContent>
						<GitHubLoginButton />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
