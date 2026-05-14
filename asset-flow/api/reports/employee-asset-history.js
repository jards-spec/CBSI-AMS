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
    const employees = await queryAll(
      `
      SELECT id, name, employeeNumber, email, department, role, createdAt
      FROM Employee
      WHERE COALESCE(isArchived, 0) = 0
      ORDER BY department, name
      `,
    );

    const assets = await queryAll(
      `
      SELECT
        a.id,
        a.tag,
        a.name,
        a.category,
        a.unitCost,
        a.status,
        a.employeeId,
        a.checkoutDate,
        a.expectedCheckinDate,
        e.name AS assignedTo,
        e.department
      FROM Asset a
      LEFT JOIN Employee e ON e.id = a.employeeId
      WHERE COALESCE(a.isArchived, 0) = 0
      `,
    );

    const licenseAssignments = await queryAll(
      `
      SELECT
        la.id,
        la.licenseId,
        la.employeeId,
        la.quantity,
        la.assignedAt,
        la.status,
        l.name AS licenseName,
        l.unitCost,
        e.name AS employeeName,
        e.department
      FROM LicenseAssignment la
      LEFT JOIN License l ON l.id = la.licenseId
      LEFT JOIN Employee e ON e.id = la.employeeId
      WHERE la.status = 'ACTIVE'
      `,
    );

    const notifications = await queryAll(
      `
      SELECT
        n.id,
        n.employeeId,
        n.type,
        n.status AS confirmationStatus,
        n.confirmedAt,
        n.createdAt,
        n.metadata
      FROM Notification n
      WHERE n.type IN ('ASSET_ASSIGNMENT', 'LICENSE_ASSIGNMENT')
      ORDER BY n.createdAt DESC
      `,
    );

    const report = employees.map((emp) => {
      const assignedAssets = assets.filter((a) => a.employeeId === emp.id);
      const totalAssetValue = assignedAssets.reduce((sum, a) => sum + Number(a.unitCost || 0), 0);

      const assignedLicenses = licenseAssignments.filter((la) => la.employeeId === emp.id);
      const totalLicenseValue = assignedLicenses.reduce((sum, la) => sum + Number(la.unitCost || 0) * Number(la.quantity || 1), 0);

      const empNotifications = notifications.filter((n) => n.employeeId === emp.id);
      const pendingConfirmations = empNotifications.filter((n) => n.status === 'PENDING').length;
      const confirmedCount = empNotifications.filter((n) => n.status === 'CONFIRMED').length;
      const declinedCount = empNotifications.filter((n) => n.status === 'DECLINED').length;

      return {
        id: emp.id,
        name: emp.name,
        employeeNumber: emp.employeeNumber,
        email: emp.email,
        department: emp.department,
        role: emp.role,
        assetCount: assignedAssets.length,
        totalAssetValue,
        licenseCount: assignedLicenses.length,
        totalLicenseValue,
        totalValue: totalAssetValue + totalLicenseValue,
        pendingConfirmations,
        confirmedCount,
        declinedCount,
        assets: assignedAssets.map((a) => ({
          id: a.id,
          tag: a.tag,
          name: a.name,
          category: a.category,
          unitCost: Number(a.unitCost || 0),
          status: a.status,
          checkoutDate: a.checkoutDate,
          expectedCheckinDate: a.expectedCheckinDate,
        })),
        licenses: assignedLicenses.map((la) => ({
          id: la.id,
          licenseName: la.licenseName,
          quantity: Number(la.quantity || 1),
          unitCost: Number(la.unitCost || 0),
          assignedAt: la.assignedAt,
          status: la.status,
        })),
      };
    });

    report.sort((a, b) => b.totalValue - a.totalValue);

    const totalEmployees = employees.length;
    const totalAssetsAssigned = assets.filter((a) => a.employeeId).length;
    const totalLicensesAssigned = licenseAssignments.length;
    const totalValueAssigned = report.reduce((sum, e) => sum + e.totalValue, 0);
    const employeesWithPendingConfirmations = report.filter((e) => e.pendingConfirmations > 0).length;

    const byDepartment = {};
    report.forEach((emp) => {
      const dept = emp.department || 'Unassigned';
      if (!byDepartment[dept]) {
        byDepartment[dept] = { employeeCount: 0, totalValue: 0, assetCount: 0, licenseCount: 0 };
      }
      byDepartment[dept].employeeCount += 1;
      byDepartment[dept].totalValue += emp.totalValue;
      byDepartment[dept].assetCount += emp.assetCount;
      byDepartment[dept].licenseCount += emp.licenseCount;
    });

    const summary = {
      totalEmployees,
      totalAssetsAssigned,
      totalLicensesAssigned,
      totalValueAssigned,
      averageValuePerEmployee: totalEmployees > 0 ? totalValueAssigned / totalEmployees : 0,
      employeesWithPendingConfirmations,
      topEmployees: report.slice(0, 5),
      byDepartment,
    };

    return res.status(200).json({ report, summary });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}