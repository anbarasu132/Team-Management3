const db = require('../config/db');

async function getPublicHome(req, res, next) {
  try {
    const [news] = await db.query('SELECT id, title, content, created_at FROM news ORDER BY created_at DESC');
    const [vacancies] = await db.query(
      'SELECT id, title, description, slots_available, created_at FROM team_vacancies ORDER BY created_at DESC'
    );

    return res.json({ news, vacancies });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getPublicHome };
