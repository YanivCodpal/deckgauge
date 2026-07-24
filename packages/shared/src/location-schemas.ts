import { z } from 'zod/v4';

export const LocationSuggestionSchema = z.object({
  label: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});
export type LocationSuggestion = z.infer<typeof LocationSuggestionSchema>;

export const LocationSearchResponseSchema = z.object({
  results: z.array(LocationSuggestionSchema),
});
export type LocationSearchResponse = z.infer<typeof LocationSearchResponseSchema>;
