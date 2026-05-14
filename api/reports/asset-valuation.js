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
    const today = new Date();
    const currentYear = today.getFullYear();

    const assets = await queryAll(
      `
      SELECT
        a.id,
        a.tag,
        a.name,
        a.category,
        a.status,
        a.unitCost,
        a.location,
        a.purchaseDate,
        a.employeeId,
        e.name AS assignedTo,
        e.department
      FROM Asset a
      LEFT JOIN Employee e ON e.id = a.employeeId
      WHERE COALESCE(a.isArchived, 0) = 0
      ORDER BY a.unitCost DESC, a.purchaseDate DESC
      `,
    );

    const report = assets.map((asset) => {
      const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;
      const ageInDays = purchaseDate ? Math.ceil((today - purchaseDate) / (1000 * 60 * 60 * 24)) : null;
      const ageInYears = ageInDays !== null ? Math.floor(ageInDays / 365) : null;
      const purchaseYear = purchaseDate ? purchaseDate.getFullYear() : null;

      return {
        id: asset.id,
        tag: asset.tag,
        name: asset.name,
        category: asset.category,
        status: asset.status,
        unitCost: Number(asset.unitCost || 0),
        location: asset.location,
        purchaseDate: asset.purchaseDate,
        ageInDays,
        ageInYears,
        purchaseYear,
        assignedTo: asset.assignedTo,
        department: asset.department,
        isArchived: Number(asset.isArchived || 0),
      };
    });

    const totalValue = report.reduce((sum, a) => sum + a.unitCost, 0);
    const totalAssets = report.length;

    const byCategory = {};
    report.forEach((asset) => {
      const cat = asset.category || 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, value: 0 };
      byCategory[cat].count += 1;
      byCategory[cat].value += asset.unitCost;
    });

    const byDepartment = {};
    report.forEach((asset) => {
      const dept = asset.department || 'Unassigned';
      if (!byDepartment[dept]) byDepartment[dept] = { count: 0, value: 0 };
      byDepartment[dept].count += 1;
      byDepartment[dept].value += asset.unitCost;
    });

    const byStatus = {};
    report.forEach((asset) => {
      const status = asset.status || 'Unknown';
      if (!byStatus[status]) byStatus[status] = { count: 0, value: 0 };
      byStatus[status].count += 1;
      byStatus[status].value += asset.unitCost;
    });

    const byPurchaseYear = {};
    report.forEach((asset) => {
      const year = asset.purchaseYear || 'Unknown';
      if (!byPurchaseYear[year]) byPurchaseYear[year] = { count: 0, value: 0 };
      byPurchaseYear[year].count += 1;
      byPurchaseYear[year].value += asset.unitCost;
    });

    const ageBrackets = {
      '0-1 years': { count: 0, value: 0 },
      '1-3 years': { count: 0, value: 0 },
      '3-5 years': { count: 0, value: 0 },
      '5+ years': { count: 0, value: 0 },
      'Unknown': { count: 0, value: 0 },
    };

    report.forEach((asset) => {
      if (asset.ageInYears === null) {
        ageBrackets['Unknown'].count += 1;
        ageBrackets['Unknown'].value += asset.unitCost;
      } else if (asset.ageInYears < 1) {
        ageBrackets['0-1 years'].count += 1;
        ageBrackets['0-1 years'].value += asset.unitCost;
      } else if (asset.ageInYears < 3) {
        ageBrackets['1-3 years'].count += 1;
        ageBrackets['1-3 years'].value += asset.unitCost;
      } else if (asset.ageInYears < 5) {
        ageBrackets['3-5 years'].count += 1;
        ageBrackets['3-5 years'].value += asset.unitCost;
      } else {
        ageBrackets['5+ years'].count += 1;
        ageBrackets['5+ years'].value += asset.unitCost;
      }
    });

    const currentYearPurchases = report.filter((a) => a.purchaseYear === currentYear);
    const previousYearPurchases = report.filter((a) => a.purchaseYear === currentYear - 1);

    const summary = {
      totalAssets,
      totalValue,
      averageAssetValue: totalAssets > 0 ? totalValue / totalAssets : 0,
      byCategory,
      byDepartment,
      byStatus,
      byPurchaseYear,
      ageBrackets,
      currentYearPurchases: {
        count: currentYearPurchases.length,
        value: currentYearPurchases.reduce((sum, a) => sum + a.unitCost, 0),
      },
      previousYearPurchases: {
        count: previousYearPurchases.length,
        value: previousYearPurchases.reduce((sum, a) => sum + a.unitCost, 0),
      },
    };

    return res.status(200).json({ report, summary });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}