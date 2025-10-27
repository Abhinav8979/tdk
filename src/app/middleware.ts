import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/", // 👈 redirect here if not authenticated
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*", // Protect dashboard routes
    "/profile/:path*", // Protect profile routes
    "/api/secure/:path*", // Protect API routes if needed
  ],
};
