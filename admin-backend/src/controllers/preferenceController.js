const Preference = require('../models/preferenceModel');

// Add or update user preferences (watchlist, favorites)
exports.addPreference = async (req, res) => {
  try {
    const { user_id, type, items } = req.body;
    let preference = await Preference.findOne({ user_id, type });

    if (preference) {
      preference.items = items;
    } else {
      preference = new Preference({ user_id, type, items });
    }

    await preference.save();
    res.json({ message: 'Preference saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save preference' });
  }
};
