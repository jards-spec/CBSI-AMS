import { useAudit } from '../context/AuditContext';

export const useTransaction = () => {
  const { addLog } = useAudit();

  const checkoutItem = (
    item: any, 
    type: 'assets' | 'accessories' | 'consumables' | 'components' | 'licenses', 
    details: any
  ) => {
    // Assets uses ams_inventory, others use ams_type
    const storageKey = type === 'assets' ? 'ams_inventory' : `ams_${type}`;
    const rawData = localStorage.getItem(storageKey);
    const data = rawData ? JSON.parse(rawData) : [];

    const updatedData = data.map((entry: any) => {
      if (entry.id === item.id) {
        if (type === 'assets') {
          return { 
            ...entry, 
            status: 'Deployed', 
            assignedTo: details.user, 
            location: details.location || entry.location,
            checkoutDate: details.checkoutDate || details.date,
            expectedCheckin: details.expectedCheckin || null,
            notes: details.notes || ''
          };
        }
        
        // Quantifiable items logic
        const spendQty = details.qty || 1;
        if (entry.remaining !== undefined) return { ...entry, remaining: Math.max(0, entry.remaining - spendQty) };
        if (entry.quantity !== undefined) return { ...entry, quantity: Math.max(0, entry.quantity - spendQty) };
        if (entry.avail !== undefined) return { ...entry, avail: Math.max(0, entry.avail - spendQty) };
      }
      return entry;
    });

    if (type === 'assets') {
      addLog('CHECKOUT', 'Admin', 'ASSET', `Asset ${item.tag} (${item.name}) checked out to ${details.user}`);
    } else {
      addLog('ISSUE', 'Admin', type.toUpperCase().slice(0, -1), `Issued ${details.qty || 1}x ${item.name} to ${details.user}`);
    }

    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    return updatedData;
  };

  const checkinItem = (item: any, type: 'assets' | 'accessories' | 'components', details: any) => {
    const storageKey = type === 'assets' ? 'ams_inventory' : `ams_${type}`;
    const data = JSON.parse(localStorage.getItem(storageKey) || '[]');

    const updatedData = data.map((entry: any) => {
      if (entry.id === item.id) {
        return { 
          ...entry, 
          status: details.status || 'Available', 
          assignedTo: null, 
          checkoutDate: null,
          expectedCheckin: null,
          notes: details.notes || ''
        };
      }
      return entry;
    });

    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    addLog('CHECKIN', 'Admin', type.toUpperCase().slice(0, -1), `Returned ${item.tag || item.name}. Status: ${details.status}`);
    
    return updatedData;
  };

  return { checkoutItem, checkinItem };
};