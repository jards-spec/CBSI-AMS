import { useState, useEffect } from 'react';
import type { Asset, AuditLog, Consumable, Accessory, License } from '../types';

export function useAssetData() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getData = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
    
    setAssets(getData('assetflow_assets'));
    setAuditLogs(getData('assetflow_audit'));
    setConsumables(getData('assetflow_consumables'));
    setAccessories(getData('assetflow_accessories'));
    setLicenses(getData('assetflow_licenses'));
    
    setLoading(false);
  }, []);

  const addLog = (action: string, details: string) => {
    const logs = JSON.parse(localStorage.getItem('assetflow_audit') || '[]');
    const newLog: AuditLog = {
      id: crypto.randomUUID(),
      assetId: 'system',
      action,
      date: new Date().toLocaleString(),
      performedBy: 'Admin User',
      details
    };
    const updatedLogs = [newLog, ...logs].slice(0, 8); // Keep last 8 for UI
    localStorage.setItem('assetflow_audit', JSON.stringify(updatedLogs));
    setAuditLogs(updatedLogs);
  };

  return { assets, auditLogs, consumables, accessories, licenses, loading, addLog };
}

