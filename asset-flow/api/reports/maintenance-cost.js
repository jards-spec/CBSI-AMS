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
    const currentYear = now.getFullYear();

    const maintenance = await queryAll(
      `
      SELECT
        m.id,
        m.title,
        m.description,
        m.status,
        m.priority,
        m.cost,
        m.submittedAt,
        m.assetId,
        m.category,
        a.tag AS assetTag,
        a.name AS assetName,
        a.unitCost AS assetValue,
        a.category AS assetCategory
      FROM Maintenance m
      LEFT JOIN Asset a ON a.id = m.assetId
      WHERE COALESCE(m.isArchived, 0) = 0
      ORDER BY m.submittedAt DESC
      `,
    );

    const report = maintenance.map((m) => {
      const submittedAt = m.submittedAt ? new Date(m.submittedAt) : null;
      const month = submittedAt ? submittedAt.getMonth() : null;
      const year = submittedAt ? submittedAt.getFullYear() : null;
      const costVsValue = m.assetValue > 0 ? (m.cost / m.assetValue) * 100 : 0;

      return {
        id: m.id,
        title: m.title,
        description: m.description,
        status: m.status,
        priority: m.priority,
        cost: Number(m.cost || 0),
        submittedAt: m.submittedAt,
        month,
        year,
        assetId: m.assetId,
        assetTag: m.assetTag,
        assetName: m.assetName,
        assetValue: Number(m.assetValue || 0),
        assetCategory: m.assetCategory,
        category: m.category,
        costVsValue: Math.round(costVsValue * 100) / 100,
        isHighCost: costVsValue > 50,
      };
    });

    const totalCost = report.reduce((sum, m) => sum + m.cost, 0);
    const totalRecords = report.length;

    const byAsset = {};
    report.forEach((m) => {
      const key = m.assetId || 'unassigned';
      if (!byAsset[key]) {
        byAsset[key] = {
          assetId: m.assetId,
          assetTag: m.assetTag,
          assetName: m.assetName,
          assetValue: m.assetValue,
          assetCategory: m.assetCategory,
          maintenanceCount: 0,
          totalCost: 0,
          tickets: [],
        };
      }
      byAsset[key].maintenanceCount += 1;
      byAsset[key].totalCost += m.cost;
      byAsset[key].tickets.push({
        id: m.id,
        title: m.title,
        cost: m.cost,
        status: m.status,
        priority: m.priority,
        submittedAt: m.submittedAt,
      });
    });

    const assetsReport = Object.values(byAsset).map((asset) => {
      const costVsValue = asset.assetValue > 0 ? (asset.totalCost / asset.assetValue) * 100 : 0;
      return {
        ...asset,
        costVsValue: Math.round(costVsValue * 100) / 100,
        isHighCost: costVsValue > 50,
        shouldReplace: costVsValue > 100,
      };
    }).sort((a, b) => b.totalCost - a.totalCost);

    const monthlyTrends = {};
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentYear, now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrends[key] = {
        month: date.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        year: date.getFullYear(),
        monthNum: date.getMonth(),
        count: 0,
        cost: 0,
      };
    }

    report.forEach((m) => {
      if (m.year !== null && m.month !== null) {
        const key = `${m.year}-${String(m.month + 1).padStart(2, '0')}`;
        if (monthlyTrends[key]) {
          monthlyTrends[key].count += 1;
          monthlyTrends[key].cost += m.cost;
        }
      }
    });

    const trendsArray = Object.values(monthlyTrends);

    const byPriority = {
      'Critical': { count: 0, cost: 0 },
      'High': { count: 0, cost: 0 },
      'Medium': { count: 0, cost: 0 },
      'Low': { count: 0, cost: 0 },
    };

    report.forEach((m) => {
      const priority = m.priority || 'Medium';
      if (byPriority[priority]) {
        byPriority[priority].count += 1;
        byPriority[priority].cost += m.cost;
      }
    });

    const byStatus = {
      'Open': { count: 0, cost: 0 },
      'In Progress': { count: 0, cost: 0 },
      'Resolved': { count: 0, cost: 0 },
      'Closed': { count: 0, cost: 0 },
    };

    report.forEach((m) => {
      const status = m.status || 'Open';
      if (byStatus[status]) {
        byStatus[status].count += 1;
        byStatus[status].cost += m.cost;
      }
    });

    const currentYearCost = report.filter((m) => m.year === currentYear).reduce((sum, m) => sum + m.cost, 0);
    const previousYearCost = report.filter((m) => m.year === currentYear - 1).reduce((sum, m) => sum + m.cost, 0);

    const summary = {
      totalRecords,
      totalCost,
      averageCostPerTicket: totalRecords > 0 ? totalCost / totalRecords : 0,
      assetsWithMaintenance: assetsReport.length,
      highCostAssetsCount: assetsReport.filter((a) => a.isHighCost).length,
      shouldReplaceCount: assetsReport.filter((a) => a.shouldReplace).length,
      byPriority,
      byStatus,
      byCategory: {},
      trends: trendsArray,
      currentYearCost,
      previousYearCost,
      yearOverYearChange: previousYearCost > 0 ? Math.round(((currentYearCost - previousYearCost) / previousYearCost) * 100) : 0,
      topCostlyAssets: assetsReport.slice(0, 5),
    };

    return res.status(200).json({ report, assetsReport, summary });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}