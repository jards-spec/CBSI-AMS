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
    // Get all employees
    const employees = await queryAll(
      `
      SELECT id, name, employeeNumber, email, department, role, createdAt
      FROM Employee
      WHERE COALESCE(isArchived, 0) = 0
      ORDER BY department, name
      `,
    );

    // Get all assets with employee info
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
        e.name AS assignedTo,
        e.department
      FROM Asset a
      LEFT JOIN Employee e ON e.id = a.employeeId
      WHERE COALESCE(a.isArchived, 0) = 0
      `,
    );

    // Get all license assignments
    const licenseAssignments = await queryAll(
      `
      SELECT
        la.id,
        la.licenseId,
        la.employeeId,
        la.quantity,
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

    // Build department stats
    const departmentStats = {};

    employees.forEach((emp) => {
      const dept = emp.department || 'Unassigned';
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          department: dept,
          employeeCount: 0,
          employees: [],
          assetCount: 0,
          assetValue: 0,
          licenseCount: 0,
          licenseValue: 0,
          assets: [],
          licenses: [],
        };
      }
      departmentStats[dept].employeeCount += 1;
      departmentStats[dept].employees.push({
        id: emp.id,
        name: emp.name,
        employeeNumber: emp.employeeNumber,
      });
    });

    assets.forEach((asset) => {
      const dept = asset.department || 'Unassigned';
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          department: dept,
          employeeCount: 0,
          employees: [],
          assetCount: 0,
          assetValue: 0,
          licenseCount: 0,
          licenseValue: 0,
          assets: [],
          licenses: [],
        };
      }
      departmentStats[dept].assetCount += 1;
      departmentStats[dept].assetValue += Number(asset.unitCost || 0);
      departmentStats[dept].assets.push({
        id: asset.id,
        tag: asset.tag,
        name: asset.name,
        category: asset.category,
        unitCost: Number(asset.unitCost || 0),
        status: asset.status,
      });
    });

    licenseAssignments.forEach((assignment) => {
      const dept = assignment.department || 'Unassigned';
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          department: dept,
          employeeCount: 0,
          employees: [],
          assetCount: 0,
          assetValue: 0,
          licenseCount: 0,
          licenseValue: 0,
          assets: [],
          licenses: [],
        };
      }
      departmentStats[dept].licenseCount += Number(assignment.quantity || 1);
      departmentStats[dept].licenseValue += Number(assignment.unitCost || 0) * Number(assignment.quantity || 1);
      departmentStats[dept].licenses.push({
        id: assignment.id,
        licenseName: assignment.licenseName,
        quantity: Number(assignment.quantity || 1),
        unitCost: Number(assignment.unitCost || 0),
      });
    });

    const report = Object.values(departmentStats).map((dept) => {
      const totalValue = dept.assetValue + dept.licenseValue;
      const perEmployeeValue = dept.employeeCount > 0 ? totalValue / dept.employeeCount : 0;
      const perEmployeeAssets = dept.employeeCount > 0 ? dept.assetCount / dept.employeeCount : 0;
      const perEmployeeLicenses = dept.employeeCount > 0 ? dept.licenseCount / dept.employeeCount : 0;

      return {
        ...dept,
        totalValue,
        perEmployeeValue: Math.round(perEmployeeValue * 100) / 100,
        perEmployeeAssets: Math.round(perEmployeeAssets * 100) / 100,
        perEmployeeLicenses: Math.round(perEmployeeLicenses * 100) / 100,
      };
    });

    report.sort((a, b) => b.totalValue - a.totalValue);

    const totalEmployees = employees.length;
    const totalAssetsAssigned = assets.filter((a) => a.employeeId).length;
    const totalLicensesAssigned = licenseAssignments.length;
    const totalValueAssigned = report.reduce((sum, e) => sum + e.totalValue, 0);

    const summary = {
      totalDepartments: report.length,
      totalEmployees,
      totalAssetsAssigned,
      totalLicensesAssigned,
      totalValueAssigned,
      averageValuePerEmployee: totalEmployees > 0 ? totalValueAssigned / totalEmployees : 0,
      topEmployees: report.slice(0, 5),
      byDepartment: departmentStats,
    };

    return res.status(200).json({ report, summary });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}