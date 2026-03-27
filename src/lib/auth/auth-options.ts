import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/infrastructure/database/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findFirst({
          where: { email, deletedAt: null },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      const uid = (token.userId ?? user?.id) as string | undefined;
      if (uid) {
        const row = await prisma.user.findFirst({
          where: { id: uid, deletedAt: null },
          select: { globalRole: true },
        });
        if (!row) {
          token.invalid = true;
          return token;
        }
        token.globalRole = row.globalRole;
        token.invalid = false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.invalid) {
        session.expires = new Date(0).toISOString();
        return session;
      }
      if (!session.user || !token.userId) return session;

      session.user.id = token.userId as string;
      session.user.globalRole = (token.globalRole as string) ?? "user";
      session.user.tenantId = null;
      session.user.tenantRole = null;

      const row = await prisma.user.findFirst({
        where: { id: token.userId as string, deletedAt: null },
        select: { activeTenantId: true, globalRole: true },
      });

      if (!row?.activeTenantId) return session;

      const membership = await prisma.tenantMembership.findUnique({
        where: {
          userId_tenantId: {
            userId: token.userId as string,
            tenantId: row.activeTenantId,
          },
        },
      });

      if (membership) {
        session.user.tenantId = membership.tenantId;
        session.user.tenantRole = membership.role;
        return session;
      }

      if (row.globalRole === "super_admin") {
        session.user.tenantId = row.activeTenantId;
        session.user.tenantRole = null;
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
