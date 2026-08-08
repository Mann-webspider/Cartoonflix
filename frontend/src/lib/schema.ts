import { z } from "zod";

/**
 * Validation for the content form.
 *
 * Kept deliberately close to what the API actually rejects. Duplicating the
 * server's rules more strictly here only produces a form that refuses data the
 * server would have accepted, which is worse than no client validation at all.
 */

const optionalString = z.string().trim().optional().or(z.literal(""));

/** `YYYY-MM-DD`, which is what <input type="date"> emits and TMDB returns. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .optional()
  .or(z.literal(""));

export const contentSchema = z.object({
  title: z.string().trim().min(1, "A title is required"),
  original_title: optionalString,
  tagline: optionalString,
  description: z.string().trim().min(1, "A description is required"),
  type: z.enum(["movie", "series"], { required_error: "Pick movie or series" }),
  releaseDate: isoDate,

  // The viewer groups the browse page by genre, so a title with none can only
  // ever land in the overflow rail.
  genres: z.array(z.string().trim().min(1)).min(1, "Add at least one genre"),
  tags: z.array(z.string().trim().min(1)),

  directors: z.array(z.string().trim().min(1)),
  writers: z.array(z.string().trim().min(1)),
  studios: z.array(z.string().trim().min(1)),
  languages: z.array(z.object({ code: z.string().min(1), name: z.string().min(1) })),
  cast: z.array(
    z.object({
      name: z.string().trim().min(1),
      character: optionalString,
      profile_url: optionalString,
      order: z.number().optional(),
    })
  ),

  certification: optionalString,
  runtime_minutes: z.coerce.number().int().positive().optional().or(z.literal("")),
  tmdb_id: z.coerce.number().int().positive().optional().or(z.literal("")),
  imdb_id: optionalString,
  tmdb_score: z.coerce.number().min(0).max(10).optional().or(z.literal("")),
  tmdb_votes: z.coerce.number().int().min(0).optional().or(z.literal("")),

  poster_url: optionalString,
  thumbnail_url: optionalString,
  backdrop_url: optionalString,

  isPublish: z.boolean(),
  deleted: z.boolean(),
});

export type ContentFormValues = z.infer<typeof contentSchema>;

export const episodeSchema = z.object({
  episode_number: z.coerce.number().int().positive("Episode numbers start at 1"),
  title: optionalString,
  description: optionalString,
  air_date: isoDate,
});

export type EpisodeFormValues = z.infer<typeof episodeSchema>;

/** Blank form state for a brand-new title. */
export const emptyContent = (): ContentFormValues => ({
  title: "",
  original_title: "",
  tagline: "",
  description: "",
  type: "movie",
  releaseDate: "",
  genres: [],
  tags: [],
  directors: [],
  writers: [],
  studios: [],
  languages: [],
  cast: [],
  certification: "",
  runtime_minutes: "",
  tmdb_id: "",
  imdb_id: "",
  tmdb_score: "",
  tmdb_votes: "",
  poster_url: "",
  thumbnail_url: "",
  backdrop_url: "",
  isPublish: false,
  deleted: false,
});

/**
 * Strip the empty strings the form uses for "not set" before sending. Mongo
 * would otherwise store `""` for every untouched optional field, and `""` is
 * not the same as absent when the viewer decides whether to render a row.
 */
export const toPayload = (values: ContentFormValues) => {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === "" || value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) {
      // Arrays still send empty, so clearing every genre actually clears it.
      payload[key] = value;
      continue;
    }
    payload[key] = value;
  }
  return payload;
};
