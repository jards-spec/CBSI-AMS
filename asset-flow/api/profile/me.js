import { createClient } from '@libsql/client';

export default async function handler(req, res) {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const queryOne = async (sql, args = []) => {
    const result = await db.execute({ sql, args });
    return result.rows[0] || null;
  };

  const queryAll = async (sql, args = []) => {
    const result = await db.execute({ sql, args });
    return result.rows || [];
  };

  // GET - Get current user profile
  if (req.method === 'GET') {
    try {
      // Get user ID from query (passed from frontend auth context)
      const userId = req.query.userId;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const employee = await queryOne('SELECT * FROM Employee WHERE id = ?', [userId]);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Remove sensitive fields
      const { password, ...safeProfile } = employee;

      // Get stats
      const reqCount = await queryOne(
        `
        SELECT COUNT(*) AS count
        FROM Request
        WHERE COALESCE(isArchived, 0) = 0
          AND submittedById = ?
        `,
        [userId],
      );

      const mtCount = await queryOne(
        `
        SELECT COUNT(*) AS count
        FROM Maintenance
        WHERE COALESCE(isArchived, 0) = 0
          AND submittedById = ?
        `,
        [userId],
      );

      return res.status(200).json({
        profile: safeProfile,
        stats: {
          submittedRequests: Number(reqCount?.count || 0),
          submittedMaintenance: Number(mtCount?.count || 0),
        },
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // PUT - Update profile
  if (req.method === 'PUT') {
    try {
      const userId = req.query.userId;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const updates = [];
      const args = [];

      const setIfDefined = (column, value) => {
        if (value !== undefined) {
          updates.push(`${column} = ?`);
          args.push(value);
        }
      };

      setIfDefined('name', req.body.name);
      setIfDefined('email', req.body.email);
      setIfDefined('avatar', req.body.avatar);
      setIfDefined('phone', req.body.phone);
      setIfDefined('jobTitle', req.body.jobTitle);

      if (!updates.length) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      args.push(userId);
      await db.execute({
        sql: `UPDATE Employee SET ${updates.join(', ')} WHERE id = ?`,
        args,
      });

      const refreshed = await queryOne('SELECT * FROM Employee WHERE id = ?', [userId]);
      const { password, ...safeProfile } = refreshed;

      return res.status(200).json({ success: true, profile: safeProfile });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}