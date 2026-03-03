import { CalendarDays } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn, formatDateBR, dateStrToDate, dateToDateStr } from '@/lib/utils';
import { useState } from 'react';
import { ptBR } from 'date-fns/locale';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function DatePicker({ value, onChange, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(dateToDateStr(date));
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-10 hover:bg-transparent hover:border-primary focus-visible:ring-primary/30',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
          {value ? formatDateBR(value) : <span>Selecionar data</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateStrToDate(value)}
          onSelect={handleSelect}
          initialFocus
          locale={ptBR}
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );
}
