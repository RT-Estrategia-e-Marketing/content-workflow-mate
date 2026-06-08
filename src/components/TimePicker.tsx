import { Clock, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimePickerProps {
  value: string; // "HH:MM" or ""
  onChange: (value: string) => void;
  className?: string;
  optional?: boolean;
}

export default function TimePicker({ value, onChange, className, optional }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive selected hour/minute from controlled value
  const [selH, selM] = value ? value.split(':') : ['', ''];

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const selectHour = (h: string) => {
    onChange(`${h}:${selM || '00'}`);
  };

  const selectMinute = (m: string) => {
    onChange(`${selH || '12'}:${m}`);
    setOpen(false);
  };

  const handleInputChange = (raw: string) => {
    // Accept anything while typing
    const digits = raw.replace(/[^0-9]/g, '');
    if (digits.length === 0) {
      onChange('');
      return;
    }
    // Auto-format as HH:MM when 4 digits typed
    if (digits.length >= 4) {
      const hh = parseInt(digits.slice(0, 2), 10);
      const mm = parseInt(digits.slice(2, 4), 10);
      if (hh <= 23 && mm <= 59) {
        onChange(`${digits.slice(0, 2)}:${digits.slice(2, 4)}`);
        return;
      }
    }
    // Accept partial like "14:" or "14:3"
    const colonMatch = raw.match(/^(\d{1,2}):(\d{0,2})$/);
    if (colonMatch) {
      const hh = parseInt(colonMatch[1], 10);
      const mm = colonMatch[2] ? parseInt(colonMatch[2], 10) : -1;
      if (hh <= 23 && (mm === -1 || mm <= 59)) {
        if (colonMatch[2].length === 2) {
          onChange(`${colonMatch[1].padStart(2, '0')}:${colonMatch[2]}`);
        }
        // Allow partial — don't call onChange yet
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-10 px-3 hover:bg-transparent hover:text-foreground hover:border-primary focus-visible:ring-primary/30',
            className
          )}
        >
          <Clock className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
          <span className={cn('flex-1 text-sm', !value && 'text-muted-foreground')}>
            {value || 'Selecione um horário'}
          </span>
          {optional && value && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={e => e.key === 'Enter' && handleClear(e as any)}
              className="ml-1 p-0.5 rounded hover:bg-muted transition-colors flex-shrink-0"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        {/* Free-type input at top */}
        <div className="px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              placeholder="ex: 14:30"
              defaultValue={value}
              onChange={e => handleInputChange(e.target.value)}
              onBlur={e => {
                // On blur, try to parse full time
                const raw = e.target.value;
                const m = raw.match(/^(\d{1,2}):(\d{2})$/);
                if (m) {
                  const hh = parseInt(m[1], 10);
                  const mm = parseInt(m[2], 10);
                  if (hh <= 23 && mm <= 59) {
                    onChange(`${m[1].padStart(2, '0')}:${m[2]}`);
                  }
                }
              }}
              className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50 w-[80px]"
            />
            {value && (
              <span className="text-xs font-semibold text-primary tabular-nums">{value}</span>
            )}
          </div>
        </div>

        {/* Hour / Minute columns */}
        <div className="flex divide-x divide-border" style={{ height: 200 }}>
          {/* Hours */}
          <div className="flex flex-col">
            <p className="text-[10px] font-semibold text-muted-foreground text-center py-1 border-b border-border bg-muted/30 uppercase tracking-wider">H</p>
            <ScrollArea className="flex-1 w-[52px]">
              <div className="flex flex-col p-1">
                {hours.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => selectHour(h)}
                    className={cn(
                      'text-xs h-7 w-full rounded font-mono transition-colors',
                      selH === h
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'text-foreground/70 hover:bg-muted'
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Minutes */}
          <div className="flex flex-col">
            <p className="text-[10px] font-semibold text-muted-foreground text-center py-1 border-b border-border bg-muted/30 uppercase tracking-wider">Min</p>
            <ScrollArea className="flex-1 w-[52px]">
              <div className="flex flex-col p-1">
                {minutes.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => selectMinute(m)}
                    className={cn(
                      'text-xs h-7 w-full rounded font-mono transition-colors',
                      selM === m
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'text-foreground/70 hover:bg-muted'
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Confirm / Clear footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20">
          {optional ? (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpar
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
          >
            {value ? `Confirmar ${value}` : 'Fechar'}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
