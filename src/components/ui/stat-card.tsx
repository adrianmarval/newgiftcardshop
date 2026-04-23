import { Card, CardContent, CardHeader, CardTitle } from './card';
import { StatCardProps } from '@/types/ui';

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center gap-2">
        {icon}
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
