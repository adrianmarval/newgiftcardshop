'use client';

import { RegistryCard, BrandIcon, UserBadge, getOrderStatusLabel } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { giftcardIssueTypeConfig } from '@/lib/config';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { AdminIssueDetails } from './admin-issue-details';
import type { AdminGiftcardIssue } from '@/types';

interface AdminIssueCardProps {
  issue: AdminGiftcardIssue;
  isExpanded?: boolean;
  isHighlighted?: boolean;
  onToggle: () => void;
}

export function AdminIssueCard({ issue, isExpanded = false, isHighlighted = false, onToggle }: AdminIssueCardProps) {
  const typeConfig = giftcardIssueTypeConfig[issue.issueType];
  const currency = issue.giftcard.country?.currency || 'USD';
  const orderStatus = getOrderStatusLabel(issue.order.status, 'es');

  return (
    <RegistryCard
      id={issue.id}
      title={
        <span>
          {issue.giftcard.brand.name} · {formatCurrency(issue.giftcard.amount, { currency })}
        </span>
      }
      subtitle={<UserBadge user={issue.buyer} size="sm" />}
      icon={<BrandIcon image={issue.giftcard.brand.image} name={issue.giftcard.brand.name} fallbackIcon={issue.giftcard.brand.icon} />}
      topRightContent={
        <Badge variant="outline" className={typeConfig.color}>
          {typeConfig.label}
        </Badge>
      }
      date={formatDateTime(issue.createdAt, 'es-AR')}
      isExpanded={isExpanded}
      isHighlighted={isHighlighted}
      onToggle={onToggle}
      statusLabel={{ text: `Orden ${orderStatus.text}`, colorClass: orderStatus.colorClass }}
    >
      <AdminIssueDetails issue={issue} />
    </RegistryCard>
  );
}
