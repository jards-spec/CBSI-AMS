import { useAudit as useAuditContext } from '../context/AuditContext';

// This simply redirects the old hook to use the new Context
export const useAudit = useAuditContext;

