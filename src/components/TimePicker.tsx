import { Clock, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface TimePickerProps {
  value: string; // "HH:MM" or ""
  onChange: (value: string) => void;
  className?: string;
  optional?: boolean; // if true, shows a clear button
}

export default function TimePicker({ value, onChange, className, optional }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [inputMode, setInputMode] = useState(false);

  const [h, m] = (value || '').split(':');

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  // All 60 minutes
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleHourSelect = (hour: string) => {
    const currentMin = m || '00';
    onChange(`${hour}:${currentMin}`);
  };

  const handleMinuteSelect = (minute: string) => {
    const currentHour = h || '12';
    onChange(`${currentHour}:${minute}`);
    setOpen(false);
  };

  const handleRawInput = (val: string) => {
    setRawInput(val);
    // Parse HH:MM or HHMM patterns
    const cleaned = val.replace(/[^0-9:]/g, '');
    const match = cleaned.match(/^(\d{1,2}):?(\d{2})$/);
    if (match) {
      const hh = parseInt(match[1]);
      const mm = parseInt(match[2]);
      if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
        onChange(`${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`);
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
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
          <Clock className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
          <span className="flex-1">{value || 'Horário (opcional)'}</span>
          {optional && value && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={e => e.key === 'Enter' && handleClear(e as any)}
              className="ml-1 p-0.5 rounded hover:bg-muted transition-colors"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {/* Free-type input */}
        <div className="p-2 border-b border-border">
          <Input
            placeholder="Digite o horário (ex: 14:30)"
            value={inputMode ? rawInput : value}
            onChange={e => { setInputMode(true); handleRawInput(e.target.value); }}
            onFocus={() => { setInputMode(true); setRawInput(value); }}
            onBlur={() => setInputMode(false)}
            className="h-8 text-xs"
            maxLength={5}
          />
        </div>
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
