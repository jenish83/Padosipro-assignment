import express from 'express';
import { schemas, validate } from '../validation.js';
import { badRequest } from '../errors.js';

export default function meRoutes({ db, requireAuth }) {
  const router = express.Router();
  const getProfile = db.prepare('SELECT name, mobile, address, business_name AS businessName FROM profiles WHERE user_id = ?');
  const selectedTasks = db.prepare(
    `SELECT t.id, t.name, t.category, t.description FROM user_tasks ut
     JOIN tasks t ON t.id = ut.task_id WHERE ut.user_id = ? ORDER BY t.category, t.name`
  );

  // Everything the app needs to decide which screen to show, in one call.
  function snapshot(user) {
    const profile = getProfile.get(user.id) || null;
    const tasks = selectedTasks.all(user.id);
    return { user: { id: user.id, email: user.email }, profile, profileCompleted: !!profile, selectedTasks: tasks };
  }

  // GET /api/me
  router.get('/me', requireAuth, (req, res) => res.json(snapshot(req.user)));

  // PUT /api/me/profile
  router.put('/me/profile', requireAuth, (req, res) => {
    const p = validate(schemas.profile, req.body);
    db.prepare(
      `INSERT INTO profiles (user_id, name, mobile, address, business_name, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET name = excluded.name, mobile = excluded.mobile,
         address = excluded.address, business_name = excluded.business_name, updated_at = excluded.updated_at`
    ).run(req.user.id, p.name, p.mobile, p.address, p.businessName, Date.now());
    res.json(snapshot(req.user));
  });

  // GET /api/tasks  -> full catalogue
  router.get('/tasks', requireAuth, (_req, res) => {
    res.json({ tasks: db.prepare('SELECT id, name, category, description FROM tasks ORDER BY category, name').all() });
  });

  // PUT /api/me/tasks  -> replaces the user's selection
  router.put('/me/tasks', requireAuth, (req, res) => {
    const { taskIds } = validate(schemas.selectTasks, req.body);
    const unique = [...new Set(taskIds)];
    const existing = db.prepare(`SELECT id FROM tasks WHERE id IN (${unique.map(() => '?').join(',')})`).all(...unique);
    if (existing.length !== unique.length) {
      throw badRequest('UNKNOWN_TASK', 'One or more selected tasks do not exist.', { fields: { taskIds: 'One or more selected tasks do not exist.' } });
    }
    db.transaction(() => {
      db.prepare('DELETE FROM user_tasks WHERE user_id = ?').run(req.user.id);
      const ins = db.prepare('INSERT INTO user_tasks (user_id, task_id) VALUES (?, ?)');
      unique.forEach((id) => ins.run(req.user.id, id));
    })();
    res.json(snapshot(req.user));
  });

  return router;
};
