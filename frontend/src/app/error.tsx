"use client";

import { useEffect } from "react";

import { StatusPage } from "@/components/layout/StatusPage";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      eyebrow="Something went wrong"
      title="We hit an unexpected error"
      description="The page ran into a problem while loading. You can try again, or head back and continue from the last step."
      action={
        <Button
          type="button"
          onClick={() => reset()}
          className="bg-lime-cyber font-heading font-semibold text-black hover:bg-lime-cyber/90 hover:glow-lime"
        >
          Try again
        </Button>
      }
    />
  );
}
