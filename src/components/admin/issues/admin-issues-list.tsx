'use client';

import { RegistryList } from '@/components/common';
import { AdminIssueCard } from './admin-issue-card';
import type { AdminGiftcardIssue } from '@/types';

interface AdminIssuesListProps {
  issues: AdminGiftcardIssue[];
}

export function AdminIssuesList({ issues }: AdminIssuesListProps) {
  return (
    <RegistryList
      items={issues}
      getId={(i) => i.id}
      getMatch={(i) => (i.isSearchMatch ? i.id : null)}
      renderItem={(issue, { isExpanded, isHighlighted, onToggle }) => (
        <AdminIssueCard issue={issue} isExpanded={isExpanded} isHighlighted={isHighlighted} onToggle={onToggle} />
      )}
      emptyTitle="No se encontraron issues"
      emptyDescription="No hay problemas reportados con los filtros actuales."
    />
  );
}
