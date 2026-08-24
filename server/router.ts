// @ts-nocheck  
import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { adminRouter } from "./school/admin-router";
import { schoolAuthRouter } from "./school/auth-router";
import { guruRouter } from "./school/guru-router";
import { ortuRouter } from "./school/ortu-router";
import { siswaRouter } from "./school/siswa-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  schoolAuth: schoolAuthRouter,
  admin: adminRouter,
  guru: guruRouter,
  siswa: siswaRouter,
  ortu: ortuRouter,
});

export type AppRouter = typeof appRouter;
