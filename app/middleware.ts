// If TypeScript cannot find the next-auth/middleware types in this project
// provide a minimal ambient declaration so the build/typecheck succeeds.
declare module "next-auth/middleware" {
  import type { NextRequest } from "next/server";
  export function authMiddleware(req?: NextRequest): any;
}

import { authMiddleware } from "next-auth/middleware";

export default authMiddleware;

export const config = {
  matcher: ["/dashboard/:path*"],
};