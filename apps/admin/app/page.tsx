import { redirect } from "next/navigation";

// Root redirects to dashboard (or login if not authenticated — handled by middleware)
export default function RootPage() {
  redirect("/dashboard");
}
