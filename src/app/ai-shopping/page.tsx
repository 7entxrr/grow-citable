"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function AIShoppingPage() {
  const { loading: authLoading } = useAuthGuard();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      router.replace("/dashboard");
    }
  }, [authLoading, router]);

  return null;
}
