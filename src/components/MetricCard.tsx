import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: LucideIcon;
  description?: string;
  className?: string;
}

export function MetricCard({ title, value, change, icon: Icon, description, className }: MetricCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card className={cn("overflow-hidden border-none shadow-sm bg-card/50 backdrop-blur-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-display">{value}</div>
        {(change !== undefined || description) && (
          <div className="flex items-center mt-1">
            {change !== undefined && (
              <span className={cn(
                "flex items-center text-xs font-semibold mr-2",
                isPositive ? "text-emerald-500" : isNegative ? "text-rose-500" : "text-muted-foreground"
              )}>
                {isPositive ? <ArrowUp className="w-3 h-3 mr-1" /> : isNegative ? <ArrowDown className="w-3 h-3 mr-1" /> : null}
                {Math.abs(change)}%
              </span>
            )}
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {description}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
