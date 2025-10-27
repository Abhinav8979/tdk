import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { $Enums } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "Email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await db.user.findFirst({
          where: { email: credentials.email },
        });

        if (user?.restricted) {
          throw new Error(
            "Your account is restricted. Please contact support."
          );
        }

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          profilePicture: user.profilePicture || null,
          isHrPortalFirstLogin: user.isHrPortalFirstLogin,
          userType: user.userType,
          role: user.role,
          referenceEmployee: user.referenceEmployee,
          reportingManager: user.reportingManager,
          empNo: user.empNo,
          restricted: user.restricted,
          storeId: user.storeId,
          store: user.store,
          profile: user.profile,
          dept: user.dept,
        };
      },
    }),
  ],
  pages: { signIn: "/login", error: "/auth/error" },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.username = user.username;
        token.profilePicture = user.profilePicture;
        token.isHrPortalFirstLogin = user.isHrPortalFirstLogin;
        token.userType = user.userType;
        token.role = user.role;
        token.referenceEmployee = user.referenceEmployee;
        token.reportingManager = user.reportingManager;
        token.empNo = user.empNo;
        token.restricted = user.restricted;
        token.storeId = user.storeId;
        token.store = user.store;
        token.profile = user.profile;
        token.dept = user.dept;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user = {
          userId: token.userId,
          email: token.email,
          username: token.username,
          profilePicture: token.profilePicture,
          isHrPortalFirstLogin: token.isHrPortalFirstLogin,
          userType: token.userType,
          role: token.role as $Enums.Role,
          referenceEmployee: token.referenceEmployee,
          reportingManager: token.reportingManager,
          empNo: token.empNo,
          restricted: token.restricted,
          storeId: token.storeId,
          store: token.store,
          profile: token.profile,
          dept: token.dept,
        };

        // Handle store association logic
        if (typeof token.store === "string" && token.store.trim() !== "") {
          try {
            await db.$transaction(async (tx) => {
              const storeName = (token.store ?? "").trim();

              // Check if user is HR
              const isHr = token.profile === "hr_coordinator";

              // Remove HR from incorrect stores
              if (isHr) {
                const storesWithHr = await tx.store.findMany({
                  where: {
                    hrs: { some: { id: token.userId } },
                  },
                  select: { id: true, name: true },
                });

                for (const store of storesWithHr) {
                  if (store.name.toLowerCase() !== storeName.toLowerCase()) {
                    console.log(
                      `Removing HR ${token.userId} from store: ${store.name} (id: ${store.id})`
                    );
                    await tx.store.update({
                      where: { id: store.id },
                      data: { hrs: { disconnect: { id: token.userId } } },
                    });
                  }
                }
              }

              // Check if store exists (case-insensitive)
              let store = await tx.store.findFirst({
                where: {
                  name: { equals: storeName, mode: "insensitive" },
                },
                select: { id: true, name: true, hrs: { select: { id: true } } },
              });

              // Create store if it doesn't exist
              if (!store) {
                console.log(`Creating store: ${storeName}`);
                store = await tx.store.create({
                  data: {
                    name: storeName,
                    ...(isHr ? { hrs: { connect: { id: token.userId } } } : {}),
                  },
                  select: {
                    id: true,
                    name: true,
                    hrs: { select: { id: true } },
                  },
                });

                await tx.calendar.create({
                  data: {
                    storeId: store.id,
                    weekdayOff: "Sunday",
                  },
                });
              } else {
                // If store exists but with different case, update to correct case
                if (store.name !== storeName) {
                  token.store = store.name;
                  session.user.store = store.name;
                }
              }

              // Check for store mismatch or no association
              const needsUpdate = !token.storeId || token.storeId !== store.id;

              if (needsUpdate) {
                // Update user's store association
                await tx.user.update({
                  where: { id: token.userId },
                  data: {
                    storeId: store.id,
                    ...(isHr ? { isHrPortalFirstLogin: false } : {}),
                  },
                });

                // If HR, ensure connected to store's hrs relation
                if (isHr && !store.hrs.some((h) => h.id === token.userId)) {
                  console.log(
                    `Associating HR ${token.userId} with store: ${store.name} (id: ${store.id})`
                  );
                  await tx.store.update({
                    where: { id: store.id },
                    data: {
                      hrs: {
                        connect: { id: token.userId },
                      },
                    },
                  });
                }

                // Update session and token
                token.storeId = store.id;
                session.user.storeId = store.id;
                if (isHr) {
                  token.isHrPortalFirstLogin = false;
                  session.user.isHrPortalFirstLogin = false;
                }
              }
            });
          } catch (error) {
            console.error("Error handling store association:", error);
            // Log error but don't block login
          }
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const GET = NextAuth(authOptions);
export const POST = NextAuth(authOptions);
