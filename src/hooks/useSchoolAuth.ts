import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { ROLE_HOME, type SchoolRole } from "@/lib/lms";

export function useSchoolAuth() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const meQuery = trpc.schoolAuth.me.useQuery(undefined, {
    staleTime: 60_000,
    retry: false,
  });

  const logoutMutation = trpc.schoolAuth.logout.useMutation({
    onSuccess: async () => {
      utils.schoolAuth.me.setData(undefined, null);
      await utils.invalidate();
      navigate("/login", { replace: true });
    },
    onError: async () => {
      utils.schoolAuth.me.setData(undefined, null);
      await utils.invalidate();
      navigate("/login", { replace: true });
    },
  });

  const logout = useCallback(() => {
    utils.schoolAuth.me.setData(undefined, null);
    logoutMutation.mutate();
  }, [logoutMutation, utils]);

  return useMemo(() => {
    const user = (meQuery.data ?? null) as {
      id: number;
      name: string;
      email: string;
      role: SchoolRole;
    } | null;
    return {
      user,
      isAuthenticated: !!user,
      isLoading: meQuery.isLoading,
      logout,
      refresh: meQuery.refetch,
    };
  }, [meQuery.data, meQuery.isLoading, meQuery.refetch, logout]);
}

export function roleHome(role: SchoolRole): string {
  return ROLE_HOME[role];
}

