import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth is handled client-side in dashboard/layout.tsx
// This middleware just passes all requests through
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
