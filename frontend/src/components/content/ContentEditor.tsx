"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import ContentForm, { toFormValues } from "@/components/content/ContentForm";
import MediaIngest from "@/components/content/MediaIngest";
import SeasonManager from "@/components/content/SeasonManager";
import PreviewPane from "@/components/content/PreviewPane";
import { getContent, saveContent, type Content } from "@/lib/api";
import { toPayload, type ContentFormValues } from "@/lib/schema";
import { generateObjectId } from "@/lib/generateCode";

interface Props {
  initial?: Content;
}

/**
 * The whole lifecycle of one title on a single screen: details, media, then a
 * preview of the result.
 *
 * Media and Preview stay locked until the details have been saved, because
 * both need a content document to exist — the ingest pipeline writes its output
 * back onto that document, and the preview renders what was stored rather than
 * what is currently typed.
 */
export default function ContentEditor({ initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [content, setContent] = useState<Content | null>(initial ?? null);
  const [tab, setTab] = useState("details");

  // Minted on the client only. Generating it during render would produce one id
  // on the server and a different one in the browser, and React would fail to
  // hydrate the element that displays it.
  const [draftId, setDraftId] = useState(initial?._id ?? "");
  useEffect(() => {
    if (!draftId) setDraftId(generateObjectId());
  }, [draftId]);

  const saved = content !== null;
  const isSeries = (content?.type ?? "movie") === "series";
  // The storage slug differs between a film and an episode, so switching type
  // after publishing would orphan whatever is already in S3.
  const lockType = Boolean(content?.status === "ready" || content?.seasons?.length);

  const submitDetails = async (values: ContentFormValues) => {
    if (!draftId) return; // the id lands on the first client paint
    try {
      await saveContent({ _id: draftId, ...(toPayload(values) as Partial<Content>) });
      // Re-read rather than trusting the response: the server fills defaults
      // and the preview should show exactly what is stored.
      const fresh = await getContent(draftId);
      setContent(fresh);

      toast({
        title: initial ? "Details updated" : "Title created",
        description: saved ? undefined : "You can now add media.",
      });

      if (!initial) router.replace(`/admin/edit/${draftId}`);
      if (!saved) setTab("media");
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
      throw err;
    }
  };

  const reload = async () => setContent(await getContent(draftId));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 lg:p-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {content?.title || "New title"}
          </h1>
          {/* Empty for one paint while the client mints the id. */}
          <p className="mt-1 min-h-4 font-mono text-xs text-muted-foreground">{draftId}</p>
        </div>
        {content && (
          <div className="flex gap-2">
            <Badge variant="outline">{isSeries ? "Series" : "Film"}</Badge>
            <Badge variant={content.isPublish ? "default" : "outline"}>
              {content.isPublish ? "Published" : "Draft"}
            </Badge>
          </div>
        )}
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="media" disabled={!saved}>
            Media
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={!saved}>
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="pt-4">
          <ContentForm
            defaultValues={content ? toFormValues(content) : undefined}
            lockType={lockType}
            submitLabel={saved ? "Save details" : "Create title"}
            onSubmit={submitDetails}
          />
          {!saved && (
            <p className="mt-4 text-sm text-muted-foreground">
              Media and Preview unlock once this is saved.
            </p>
          )}
        </TabsContent>

        <TabsContent value="media" className="pt-4">
          {content &&
            (isSeries ? (
              <SeasonManager content={content} onChange={setContent} />
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Media</h2>
                  <p className="text-sm text-muted-foreground">
                    Transcodes on this machine. Nothing reaches S3 until you publish.
                  </p>
                </div>
                <MediaIngest contentId={content._id} onPublished={reload} />
              </div>
            ))}
        </TabsContent>

        <TabsContent value="preview" className="pt-4">
          {content && <PreviewPane content={content} onChange={setContent} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
