"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ChipsInput } from "@/components/ui/chips-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TmdbSearchDialog from "@/components/content/TmdbSearchDialog";
import { contentSchema, emptyContent, type ContentFormValues } from "@/lib/schema";
import type { Content } from "@/lib/api";

interface Props {
  defaultValues?: Partial<ContentFormValues>;
  /** Locked once a title has episodes or a transcode, since the slug depends on it. */
  lockType?: boolean;
  submitLabel?: string;
  onSubmit: (values: ContentFormValues) => Promise<void>;
}

/** Map an API document onto form values, turning absent fields into "". */
export const toFormValues = (content: Content): ContentFormValues => ({
  ...emptyContent(),
  ...content,
  releaseDate: content.releaseDate ?? "",
  runtime_minutes: content.runtime_minutes ?? "",
  tmdb_id: content.tmdb_id ?? "",
  tmdb_score: content.tmdb_score ?? "",
  tmdb_votes: content.tmdb_votes ?? "",
  genres: content.genres ?? [],
  tags: content.tags ?? [],
  directors: content.directors ?? [],
  writers: content.writers ?? [],
  studios: content.studios ?? [],
  cast: content.cast ?? [],
  languages: content.languages ?? [],
  isPublish: content.isPublish ?? false,
  deleted: content.deleted ?? false,
});

export default function ContentForm({
  defaultValues,
  lockType = false,
  submitLabel = "Save details",
  onSubmit,
}: Props) {
  const form = useForm<ContentFormValues>({
    resolver: zodResolver(contentSchema),
    defaultValues: { ...emptyContent(), ...defaultValues },
    mode: "onBlur",
  });

  // Editing a different title reuses this component instance, so the fields
  // have to be told to take the new values.
  useEffect(() => {
    if (defaultValues) form.reset({ ...emptyContent(), ...defaultValues });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues]);

  const type = form.watch("type");
  const cast = form.watch("cast");
  const languages = form.watch("languages");

  /**
   * TMDB fills the descriptive fields and leaves everything else alone —
   * publish state, tags the operator chose, and any artwork the pipeline has
   * already produced are not TMDB's to overwrite.
   */
  const applyTmdb = (details: Partial<Content>) => {
    const current = form.getValues();
    form.reset({
      ...current,
      title: details.title ?? current.title,
      original_title: details.original_title ?? "",
      tagline: details.tagline ?? "",
      description: details.description ?? current.description,
      releaseDate: details.releaseDate ?? current.releaseDate,
      genres: details.genres?.length ? details.genres : current.genres,
      directors: details.directors ?? [],
      writers: details.writers ?? [],
      studios: details.studios ?? [],
      languages: details.languages ?? [],
      cast: details.cast ?? [],
      certification: details.certification ?? "",
      runtime_minutes: details.runtime_minutes ?? "",
      tmdb_id: details.tmdb_id ?? "",
      imdb_id: details.imdb_id ?? "",
      tmdb_score: details.tmdb_score ?? "",
      tmdb_votes: details.tmdb_votes ?? "",
      // Only adopt TMDB artwork where nothing has been published yet.
      poster_url: current.poster_url || details.poster_url || "",
      backdrop_url: current.backdrop_url || details.backdrop_url || "",
    });
    form.trigger();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Details</h2>
            <p className="text-sm text-muted-foreground">
              What viewers read on the title page.
            </p>
          </div>
          <TmdbSearchDialog
            type={type}
            defaultQuery={form.getValues("title")}
            onPick={applyTmdb}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Tom and Jerry: The Movie" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="original_title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Original title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Optional" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tagline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tagline</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Optional" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Synopsis</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={4} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={lockType}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Film or series" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="movie">Film</SelectItem>
                    <SelectItem value="series">Series</SelectItem>
                  </SelectContent>
                </Select>
                {lockType && (
                  <FormDescription>
                    Locked — media has already been published under this type.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="releaseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Release date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="genres"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Genres</FormLabel>
                <FormControl>
                  <ChipsInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Animation, Comedy…"
                  />
                </FormControl>
                <FormDescription>
                  The viewer builds its browse rails from the rarest genre a title
                  carries, so a specific one is worth more than a broad one.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <ChipsInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Characters, franchise, keywords…"
                  />
                </FormControl>
                <FormDescription>Searchable, but never shown as a rail.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold">Credits</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Filled by TMDB, editable by hand.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="directors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Directors</FormLabel>
                  <FormControl>
                    <ChipsInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="writers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Writers</FormLabel>
                  <FormControl>
                    <ChipsInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="studios"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Studios</FormLabel>
                  <FormControl>
                    <ChipsInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Read-only: cast and languages come as structured records, and a
              chips input would flatten away the character names. */}
          {cast.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium">Cast ({cast.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {cast.slice(0, 12).map((member) => (
                  <span
                    key={member.name}
                    className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                    title={member.character || undefined}
                  >
                    {member.name}
                  </span>
                ))}
                {cast.length > 12 && (
                  <span className="px-1 py-0.5 text-xs text-muted-foreground">
                    +{cast.length - 12} more
                  </span>
                )}
              </div>
            </div>
          )}

          {languages.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">Languages</p>
              <p className="text-sm text-muted-foreground">
                {languages.map((language) => language.name).join(", ")}
              </p>
            </div>
          )}
        </div>

        <Separator />

        <div className="grid gap-5 sm:grid-cols-4">
          <FormField
            control={form.control}
            name="certification"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Certification</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="U / PG" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="runtime_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Runtime (min)</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="numeric" />
                </FormControl>
                <FormDescription className="text-xs">
                  Superseded by the measured duration once transcoded.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tmdb_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>TMDB id</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="numeric" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="imdb_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IMDb id</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="tt0000000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="flex flex-wrap gap-8">
          <FormField
            control={form.control}
            name="isPublish"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div>
                  <FormLabel>Published</FormLabel>
                  <FormDescription>Visible to viewers.</FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deleted"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div>
                  <FormLabel>Archived</FormLabel>
                  <FormDescription>Hidden everywhere, not deleted.</FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
          {form.formState.isDirty && !form.formState.isSubmitting && (
            <span className="text-sm text-muted-foreground">Unsaved changes</span>
          )}
        </div>
      </form>
    </Form>
  );
}
