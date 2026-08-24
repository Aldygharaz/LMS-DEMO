import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

export function PwaUpdater() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered() {
      console.log("SW Registered");
    },
    onRegisterError(error: any) {
      console.log("SW registration error", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast.info("Update Tersedia!", {
        description: "Versi terbaru LMS telah diunduh. Muat ulang sekarang?",
        duration: Infinity,
        action: {
          label: "Muat Ulang",
          onClick: () => updateServiceWorker(true),
        },
        cancel: {
          label: "Nanti",
          onClick: () => setNeedRefresh(false),
        },
      });
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
