import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  if (!url.pathname.startsWith("/dashboard/buy")) {
    const response = NextResponse.next();
    response.cookies.delete("countryCode");
    response.cookies.delete("storeName");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
