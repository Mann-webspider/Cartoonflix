/**
 * How far the skip controls jump.
 *
 * Shared because two places have to agree: the on-screen seek buttons and the
 * remote's left/right. If they drift, the same gesture means two different
 * things depending on whether a cursor or a D-pad performed it.
 */
export const SEEK_SECONDS = 10;
