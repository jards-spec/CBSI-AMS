import { createClient } from '@libsql/client';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const queryAll = async (sql, args = []) => {
    const result = await db.execute({ sql, args });
    return result.rows || [];
  };

  try {
    const now = new Date();

    const notifications = await queryAll(
      `
      SELECT
        n.id,
        n.employeeId,
        n.type,
        n.title,
        n.message,
        n.metadata,
        n.status,
        n.createdAt,
        e.name AS employeeName,
        e.employeeNumber,
        e.email,
        e.department
      FROM Notification n
      LEFT JOIN Employee e ON e.id = n.employeeId
      WHERE n.type IN ('ASSET_ASSIGNMENT', 'LICENSE_ASSIGNMENT')
      ORDER BY n.createdAt DESC
      `,
    );

    const report = notifications.map((n) => {
      const createdAt = n.createdAt ? new Date(n.createdAt) : null;
      const daysPending = createdAt ? Math.ceil((now - createdAt) / (1000 * 60 * 60 * 24)) : 0;
      const metadata = n.metadata ? JSON.parse(n.metadata) : {};

      let isOverdue = false;
      let urgency = 'normal';

      if (daysPending > 7) {
        isOverdue = true;
        urgency = 'critical';
      } else if (daysPending > 3) {
        urgency = 'high';
      } else if (daysPending > 1) {
        urgency = 'medium';
      }

      return {
        id: n.id,
        employeeId: n.employeeId,
        employeeName: n.employeeName,
        employeeNumber: n.employeeNumber,
        employeeEmail: n.email,
        department: n.department,
        type: n.type,
        title: n.title,
        message: n.message,
        status: n.status,
        createdAt: n.createdAt,
        daysPending,
        isOverdue,
        urgency,
        metadata: {
          assetId: metadata.assetId,
          assetTag: metadata.assetTag,
          assetName: metadata.assetName,
          licenseId: metadata.licenseId,
          licenseName: metadata.licenseName,
          quantity: metadata.quantity,
          assignedById: metadata.assignedById,
          assignedByName: metadata.assignedByName,
        },
      };
    });

    const pending = report.filter((n) => n.status === 'PENDING');
    const confirmed = report.filter((n) => n.status === 'CONFIRMED');
    const declined = report.filter((n) => n.status === 'DECLINED');
    const overdue = pending.filter((n) => n.daysPending > 7);

    const byEmployee = {};
    pending.forEach((n) => {
      const key = n.employeeId;
      if (!byEmployee[key]) {
        byEmployee[key] = {
          employeeId: n.employeeId,
          employeeName: n.employeeName,
          employeeNumber: n.employeeNumber,
          email: n.employeeEmail,
          department: n.department,
          pendingCount: 0,
          overdueCount: 0,
          notifications: [],
        };
      }
      byEmployee[key].pendingCount += 1;
      if (n.isOverdue) byEmployee[key].overdueCount += 1;
      byEmployee[key].notifications.push(n);
    });

    const byDepartment = {};
    pending.forEach((n) => {
      const dept = n.department || 'Unassigned';
      if (!byDepartment[dept]) {
        byDepartment[dept] = { pendingCount: 0, overdueCount: 0 };
      }
      byDepartment[dept].pendingCount += 1;
      if (n.isOverdue) byDepartment[dept].overdueCount += 1;
    });

    const byType = {
      ASSET_ASSIGNMENT: { count: pending.filter((n) => n.type === 'ASSET_ASSIGNMENT').length },
      LICENSE_ASSIGNMENT: { count: pending.filter((n) => n.type === 'LICENSE_ASSIGNMENT').length },
    };

    const byUrgency = {
      critical: pending.filter((n) => n.urgency === 'critical').length,
      high: pending.filter((n) => n.urgency === 'high').length,
      medium: pending.filter((n) => n.urgency === 'medium').length,
      normal: pending.filter((n) => n.urgency === 'normal').length,
    };

    const summary = {
      totalNotifications: report.length,
      pendingCount: pending.length,
      confirmedCount: confirmed.length,
      declinedCount: declined.length,
      overdueCount: overdue.length,
      confirmationRate: report.length > 0 ? Math.round((confirmed.length / report.length) * 100) : 0,
      byEmployee: Object.values(byEmployee),
      byDepartment,
      byType,
      byUrgency,
      topOverdueEmployees: Object.values(byEmployee)
        .filter((e) => e.overdueCount > 0)
        .sort((a, b) => b.overdueCount - a.overdueCount)
        .slice(0, 5),
    };

    return res.status(200).json({ report, pending, confirmed, declined, summary });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}