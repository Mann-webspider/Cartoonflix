"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContentEditor from "@/components/content/ContentEditor";
import { getContent, type Content } from "@/lib/api";

/**
 * Client-side rather than a server component: the admin token lives in a
 * cookie this browser holds, and the editor needs authenticated writes
 * anyway, so fetching here keeps one auth path instead of two.
 */
export default function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getContent(id)
      .then(setContent)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-10">
        <h1 className="text-xl font-semibold">Couldn&apos;t load that title</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button asChild className="mt-6">
          <Link href="/admin">Back to the library</Link>
        </Button>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <ContentEditor initial={content} />;
}
