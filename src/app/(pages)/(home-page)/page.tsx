import { redirect } from "next/navigation";

export default function HomePage() {
	// In mock mode, redirect directly to dashboard
	redirect("/dashboard");
}
