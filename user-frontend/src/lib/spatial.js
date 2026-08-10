/**
 * Directional focus search.
 *
 * Pure geometry over rectangles, kept apart from the key handling so the part
 * that is easy to get quietly wrong can be tested without a browser. "Quietly"
 * is the operative word: a bad rule here does not throw, it just sends focus
 * somewhere surprising, which on a television reads as the remote being broken.
 */

/**
 * How much drift perpendicular to the direction of travel costs, relative to
 * distance along it. Pressing right inside a rail has to reach the next card in
 * that row and never something nearer on the line below, which is exactly what
 * a plain nearest-neighbour search gets wrong.
 */
const OFF_AXIS_WEIGHT = 3;

/**
 * Cost of moving from `from` to `to`, or null when `to` does not lie that way.
 *
 * Direction is decided on centres while distance is measured edge to edge.
 * Centres for both would punish a tall neighbour for its height; edges for both
 * would let an element that merely overlaps win every move, and focus would
 * never travel anywhere at all.
 *
 * @param {{left: number, right: number, top: number, bottom: number}} from
 * @param {{left: number, right: number, top: number, bottom: number}} to
 * @param {"left"|"right"|"up"|"down"} direction
 * @returns {number|null}
 */
export const cost = (from, to, direction) => {
  const fromX = (from.left + from.right) / 2;
  const fromY = (from.top + from.bottom) / 2;
  const toX = (to.left + to.right) / 2;
  const toY = (to.top + to.bottom) / 2;

  const advance =
    direction === "left" ? fromX - toX
    : direction === "right" ? toX - fromX
    : direction === "up" ? fromY - toY
    : toY - fromY;
  if (advance <= 1) return null;

  const gap = Math.max(
    0,
    direction === "left" ? from.left - to.right
    : direction === "right" ? to.left - from.right
    : direction === "up" ? from.top - to.bottom
    : to.top - from.bottom
  );

  const horizontal = direction === "left" || direction === "right";
  const drift = horizontal ? Math.abs(fromY - toY) : Math.abs(fromX - toX);

  return gap + drift * OFF_AXIS_WEIGHT;
};

/**
 * Pick the item to move to, or null when there is nothing that way — which is
 * what lets the caller leave the key alone so the page scrolls normally at the
 * end of a list.
 *
 * @param {object} from                     rectangle currently focused
 * @param {{rect: object}[]} items          candidates, each carrying its rect
 * @param {"left"|"right"|"up"|"down"} direction
 */
export const bestCandidate = (from, items, direction) => {
  let best = null;
  let bestCost = Infinity;

  for (const item of items) {
    const value = cost(from, item.rect, direction);
    if (value !== null && value < bestCost) {
      bestCost = value;
      best = item;
    }
  }

  return best;
};
