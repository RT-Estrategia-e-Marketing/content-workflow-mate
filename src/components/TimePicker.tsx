import { Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [open, setOpen] = useState(false);

  // Split value "HH:MM"
  const [h, m] = (value || '12:00').split(':');

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const handleHourSelect = (hour: string) => {
    onChange(`${hour}:${m}`);
  };

  const handleMinuteSelect = (minute: string) => {
    onChange(`${h}:${minute}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-10 hover:bg-transparent hover:text-foreground hover:border-primary focus-visible:ring-primary/30',
            !value && 'text-muted-foreground hover:text-muted-foreground',
            className
          )}
        >
          <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
          {value || <span>Selecionar horário</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex divide-x divide-border h-[200px]">
          <ScrollArea className="w-16">
            <div className="flex flex-col p-1">
              {hours.map((hour) => (
                <Button
                  key={hour}
                  variant="ghost"
                  className={cn(
                    'justify-center text-xs h-8 font-normal px-2',
                    h === hour && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                  )}
                  onClick={() => handleHourSelect(hour)}
                >
                  {hour}
                </Button>
              ))}
            </div>
          </ScrollArea>
          <ScrollArea className="w-16">
            <div className="flex flex-col p-1">
              {minutes.map((minute) => (
                <Button
                  key={minute}
                  variant="ghost"
                  className={cn(
                    'justify-center text-xs h-8 font-normal px-2',
                    m === minute && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                  )}
                  onClick={() => handleMinuteSelect(minute)}
                >
                  {minute}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
