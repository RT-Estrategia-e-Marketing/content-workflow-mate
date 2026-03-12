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

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const times = hours.flatMap(h => minutes.map(m => `${h}:${m}`));

  const handleSelect = (time: string) => {
    onChange(time);
    setOpen(false);
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
      <PopoverContent className="w-[120px] p-0" align="start">
        <ScrollArea className="h-[200px]">
          <div className="flex flex-col p-1">
            {times.map((t) => (
              <Button
                key={t}
                variant="ghost"
                className={cn(
                  'justify-center text-xs h-8 font-normal',
                  value === t && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                )}
                onClick={() => handleSelect(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
