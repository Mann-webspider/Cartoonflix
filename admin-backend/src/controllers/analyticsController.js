const mongoose = require("mongoose");

/**
 * Analytics reads.
 *
 * Deliberately here rather than in the viewer API. The events themselves are
 * written by the public Lambda, because that is where the visitors are — but
 * reading them back means visitor locations and the email addresses of everyone
 * who signed in, and this server only ever listens on the operator's own
 * machine. An endpoint that returns that over the internet is one forged token
 * away from handing over the audience.
 *
 * Queried through the raw driver rather than a Mongoose model: these are
 * aggregations over a collection another service owns and writes, and declaring
 * a schema for it here would be claiming an authority this side does not have.
 */
const events = () => mongoose.connection.collection("events");

/** Inclusive from, exclusive to, defaulting to the last 30 days. */
const range = (query) => {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  // An unparseable date would otherwise become a match on NaN, which silently
  // returns nothing and reads as "no traffic" rather than "bad request".
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid from/to date");
  }
  return { from, to };
};

/** Group by a field and return the biggest buckets, ignoring empty values. */
const topBy = (field, limit = 10) => [
  { $match: { [field]: { $nin: [null, ""] } } },
  { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: limit },
  { $project: { _id: 0, name: "$_id", count: 1 } },
];

/**
 * Everything the dashboard shows, in one round trip.
 *
 * One `$facet` rather than a dozen queries: the same matched set is scanned
 * once and cut a dozen ways, which on a free-tier cluster is the difference
 * between a dashboard that loads and one that is rationed.
 */
exports.getAnalytics = async (req, res) => {
  try {
    const { from, to } = range(req.query);
    const match = { createdAt: { $gte: from, $lte: to } };

    const [facets] = await events()
      .aggregate([
        { $match: match },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  events: { $sum: 1 },
                  visitors: { $addToSet: "$visitor_id" },
                  sessions: { $addToSet: "$session_id" },
                  signedIn: { $addToSet: "$user_id" },
                },
              },
              {
                $project: {
                  _id: 0,
                  events: 1,
                  visitors: { $size: "$visitors" },
                  sessions: { $size: "$sessions" },
                  // user_id is absent on anonymous events, and $addToSet keeps
                  // one null for all of them, so it has to come back out.
                  signedIn: {
                    $size: { $filter: { input: "$signedIn", cond: { $ne: ["$$this", null] } } },
                  },
                },
              },
            ],

            byType: [
              { $group: { _id: "$type", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $project: { _id: 0, name: "$_id", count: 1 } },
            ],

            daily: [
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                  events: { $sum: 1 },
                  visitors: { $addToSet: "$visitor_id" },
                },
              },
              { $sort: { _id: 1 } },
              { $project: { _id: 0, day: "$_id", events: 1, visitors: { $size: "$visitors" } } },
            ],

            countries: topBy("country"),
            cities: topBy("city"),
            referrers: topBy("referrer"),
            campaigns: topBy("utm_source"),
            devices: topBy("device", 5),
            browsers: topBy("browser", 5),
            pages: topBy("path"),

            // What was actually watched, and how far. Counting distinct
            // sessions rather than events so one viewer scrubbing back and
            // forth does not read as an audience.
            titles: [
              { $match: { type: { $in: ["title_view", "play_start", "play_complete"] } } },
              {
                $group: {
                  _id: { content: "$content_id", type: "$type" },
                  sessions: { $addToSet: "$session_id" },
                },
              },
              {
                $group: {
                  _id: "$_id.content",
                  counts: { $push: { type: "$_id.type", n: { $size: "$sessions" } } },
                },
              },
              {
                $project: {
                  _id: 0,
                  content_id: "$_id",
                  opened: {
                    $ifNull: [
                      { $first: { $map: {
                        input: { $filter: { input: "$counts", cond: { $eq: ["$$this.type", "title_view"] } } },
                        in: "$$this.n",
                      } } },
                      0,
                    ],
                  },
                  played: {
                    $ifNull: [
                      { $first: { $map: {
                        input: { $filter: { input: "$counts", cond: { $eq: ["$$this.type", "play_start"] } } },
                        in: "$$this.n",
                      } } },
                      0,
                    ],
                  },
                  finished: {
                    $ifNull: [
                      { $first: { $map: {
                        input: { $filter: { input: "$counts", cond: { $eq: ["$$this.type", "play_complete"] } } },
                        in: "$$this.n",
                      } } },
                      0,
                    ],
                  },
                },
              },
              { $sort: { played: -1, opened: -1 } },
              { $limit: 20 },
            ],

            // Searches that found nothing name a gap in the catalogue, which is
            // the one thing here that suggests what to add next.
            emptySearches: [
              { $match: { type: "search", count: 0, query: { $nin: [null, ""] } } },
              { $group: { _id: "$query", times: { $sum: 1 } } },
              { $sort: { times: -1 } },
              { $limit: 15 },
              { $project: { _id: 0, query: "$_id", times: 1 } },
            ],

            // Who, where an account puts a name to the activity.
            people: [
              { $match: { email: { $nin: [null, ""] } } },
              {
                $group: {
                  _id: "$email",
                  events: { $sum: 1 },
                  lastSeen: { $max: "$createdAt" },
                  watched: {
                    $addToSet: {
                      $cond: [{ $eq: ["$type", "play_start"] }, "$content_id", "$$REMOVE"],
                    },
                  },
                },
              },
              { $sort: { lastSeen: -1 } },
              { $limit: 50 },
              {
                $project: {
                  _id: 0,
                  email: "$_id",
                  events: 1,
                  lastSeen: 1,
                  titlesWatched: { $size: "$watched" },
                },
              },
            ],
          },
        },
      ])
      .toArray();

    const titles = facets?.titles ?? [];
    const ids = titles
      .map((row) => row.content_id)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    // Titles are named here rather than denormalised onto every event: a name
    // stored a hundred thousand times goes stale the first time it is edited.
    const named = ids.length
      ? await mongoose.connection
          .collection("contents")
          .find({ _id: { $in: ids } }, { projection: { title: 1 } })
          .toArray()
      : [];
    const titleFor = new Map(named.map((doc) => [String(doc._id), doc.title]));

    res.json({
      range: { from, to },
      totals: facets?.totals?.[0] ?? { events: 0, visitors: 0, sessions: 0, signedIn: 0 },
      byType: facets?.byType ?? [],
      daily: facets?.daily ?? [],
      countries: facets?.countries ?? [],
      cities: facets?.cities ?? [],
      referrers: facets?.referrers ?? [],
      campaigns: facets?.campaigns ?? [],
      devices: facets?.devices ?? [],
      browsers: facets?.browsers ?? [],
      pages: facets?.pages ?? [],
      titles: titles.map((row) => ({ ...row, title: titleFor.get(row.content_id) ?? "Unknown title" })),
      emptySearches: facets?.emptySearches ?? [],
      people: facets?.people ?? [],
    });
  } catch (err) {
    console.error("getAnalytics failed:", err);
    res.status(500).json({ error: err.message || "Failed to read analytics" });
  }
};
