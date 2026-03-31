import { useAudit } from '../context/AuditContext';

export const useTransaction = () => {
  const { addLog } = useAudit();

  /**
   * Universal Checkout Handler
   * Handles Assets (Status change) and Quantifiable items (Accessories, Consumables, Components, Licenses)
   */
  const checkoutItem = (
    item: any, 
    type: 'assets' | 'accessories' | 'consumables' | 'components' | 'licenses', 
    details: { user: string; location?: string; qty?: number; date: string; expectedCheckin?: string; notes?: string; checkoutTarget?: string }
  ) => {
    const storageKey = `ams_${type}`;
    const rawData = localStorage.getItem(storageKey);
    const data = rawData ? JSON.parse(rawData) : [];

    const updatedData = data.map((entry: any) => {
      if (entry.id === item.id) {
        // ASSETS logic: Update status and assignment
        if (type === 'assets') {
          return { 
            ...entry, 
            status: 'Deployed', 
            assignedTo: details.user, 
            location: details.location || null,
            checkoutDate: details.date,
            expectedCheckin: details.expectedCheckin || null,
            checkoutTarget: details.checkoutTarget || 'user',
            notes: details.notes || ''
          };
        }
        
        // Quantifiable items logic: Handle 'quantity', 'remaining', or 'avail'
        const spendQty = details.qty || 1;
        
        if (entry.remaining !== undefined) {
          return { ...entry, remaining: Math.max(0, entry.remaining - spendQty) };
        }
        if (entry.quantity !== undefined) {
          return { ...entry, quantity: Math.max(0, entry.quantity - spendQty) };
        }
        if (entry.avail !== undefined) {
          return { ...entry, avail: Math.max(0, entry.avail - spendQty) };
        }
      }
      return entry;
    });

    // Logging
    if (type === 'assets') {
      addLog('CHECKOUT', 'Admin', 'ASSET', `Asset ${item.tag} (${item.model}) checked out to ${details.user}`);
    } else {
      addLog('ISSUE', 'Admin', type.toUpperCase().slice(0, -1), `Issued ${details.qty || 1}x ${item.name} to ${details.user}`);
    }

    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    return updatedData;
  };

  /**
   * Universal Check-in Handler
   */
  const checkinItem = (item: any, type: 'assets' | 'accessories' | 'components', details: { status: string; date: string; notes?: string }) => {
    const storageKey = `ams_${type}`;
    const data = JSON.parse(localStorage.getItem(storageKey) || '[]');

    const updatedData = data.map((entry: any) => {
      if (entry.id === item.id) {
        return { 
          ...entry, 
          status: details.status || 'Ready to Deploy', 
          assignedTo: null, 
          location: null,
          checkoutDate: null,
          expectedCheckin: null,
          notes: details.notes || ''
        };
      }
      return entry;
    });

    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    addLog('CHECKIN', 'Admin', type.toUpperCase().slice(0, -1), `Returned ${item.tag || item.name} to inventory. Status: ${details.status}`);
    
    return updatedData;
  };

  return { checkoutItem, checkinItem };
};