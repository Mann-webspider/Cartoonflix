const Preference = require('../models/preferenceModel');

// Upsert a user's watchlist/favorites (user from token).
exports.addPreference = async (req, res) => {
  try {
    const { type, items } = req.body;
    if (!['watchlist', 'favorites'].includes(type)) {
      return res.status(400).json({ error: 'type must be watchlist or favorites' });
    }
    await Preference.findOneAndUpdate(
      { user_id: req.user.id, type },
      { $set: { items: items || [] } },
      { upsert: true }
    );
    res.json({ message: 'Preference saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save preference' });
  }
};

// List the current user's preferences.
exports.getPreferences = async (req, res) => {
  try {
    const preferences = await Preference.find({ user_id: req.user.id });
    res.json({ preferences });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
};
