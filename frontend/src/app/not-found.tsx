import Link from "next/link";

import { StatusPage } from "@/components/layout/StatusPage";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <StatusPage
      eyebrow="404 — Not found"
      title="This page doesn't exist"
      description="The route you're looking for isn't part of the workflow. Check the URL, or start a new project from the home page."
      action={
        <Button
          asChild
          className="bg-lime-cyber font-heading font-semibold text-black hover:bg-lime-cyber/90 hover:glow-lime"
        >
          <Link href="/">Back to home</Link>
        </Button>
      }
    />
  );
}
