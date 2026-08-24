// @ts-nocheck
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { schoolUsers } from "@db/schema";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  clearSchoolSessionCookie,
  requireSchoolUser,
  setSchoolSessionCookie,
  verifyPassword,
} from "./auth";

function publicProfile(user: {
  id: number;
  name: string;
  email: string;
  role: string;
}) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export const schoolAuthRouter = createRouter({
  /** Login email + password (4 role: admin, guru, siswa, orang_tua). */
  login: publicQuery
    .input(
      z.object({
        email: z.string().email("Format email tidak valid"),
        password: z.string().min(1, "Password wajib diisi"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(schoolUsers)
        .where(eq(schoolUsers.email, input.email.toLowerCase().trim()))
        .limit(1);
      const user = rows.at(0);
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email atau password salah.",
        });
      }
      await setSchoolSessionCookie(ctx, user.id);
      return publicProfile(user);
    }),

  logout: publicQuery.mutation(({ ctx }) => {
    clearSchoolSessionCookie(ctx);
    return { success: true };
  }),

  me: publicQuery.query(async ({ ctx }) => {
    try {
      const user = await requireSchoolUser(ctx);
      return publicProfile(user);
    } catch {
      return null;
    }
  }),
});
