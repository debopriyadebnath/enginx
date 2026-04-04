import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Route protection is handled on the client (session in localStorage). */
export default function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
