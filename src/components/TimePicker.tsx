import { Clock, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

interface TimePickerProps {
  value: string; // "HH:MM" or ""
  onChange: (value: string) => void;
  className?: string;
  optional?: boolean;
}

const ITEM_H = 36; // px height of each row

export default function TimePicker({ value, onChange, className, optional }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minColRef = useRef<HTMLDivElement>(null);

  const [selH, selM] = value ? value.split(':') : ['', ''];

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  // Auto-scroll selected item into center when popover opens
  useEffect(() => {
    if (!open) return;
    const scrollTo = (ref: React.RefObject<HTMLDivElement>, idx: number) => {
      if (ref.current && idx >= 0) {
        ref.current.scrollTop = Math.max(0, idx * ITEM_H - ref.current.clientHeight / 2 + ITEM_H / 2);
      }
    };
    setTimeout(() => {
      scrollTo(hourColRef, selH ? parseInt(selH, 10) : 0);
      scrollTo(minColRef, selM ? parseInt(selM, 10) : 0);
    }, 50);
  }, [open]);

  const selectHour = (h: string) => onChange(`${h}:${selM || '00'}`);
  const selectMinute = (m: string) => { onChange(`${selH || '12'}:${m}`); setOpen(false); };

  const handleInputChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '');
    if (digits.length === 0) { onChange(''); return; }
    if (digits.length >= 4) {
      const hh = parseInt(digits.slice(0, 2), 10);
      const mm = parseInt(digits.slice(2, 4), 10);
      if (hh <= 23 && mm <= 59) { onChange(`${digits.slice(0, 2)}:${digits.slice(2, 4)}`); return; }
    }
    const m = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      const hh = parseInt(m[1], 10), mm = parseInt(m[2], 10);
      if (hh <= 23 && mm <= 59) onChange(`${m[1].padStart(2, '0')}:${m[2]}`);
    }
  };

  const handleClear = (e: React.MouseEvent) => { e.stopPropagation(); onChange(''); setOpen(false); };

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

      <PopoverContent className="w-auto p-0 shadow-xl" align="start">
        {/* Free-type input */}
        <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            placeholder="ex: 14:30"
            defaultValue={value}
            onChange={e => handleInputChange(e.target.value)}
            onBlur={e => {
              const m = e.target.value.match(/^(\d{1,2}):(\d{2})$/);
              if (m) {
                const hh = parseInt(m[1], 10), mm = parseInt(m[2], 10);
                if (hh <= 23 && mm <= 59) onChange(`${m[1].padStart(2, '0')}:${m[2]}`);
              }
            }}
            className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50 min-w-0"
          />
          {value && <span className="text-sm font-bold text-primary tabular-nums shrink-0">{value}</span>}
        </div>

        {/* Columns — plain divs so mouse-wheel works over the whole area */}
        <div className="flex divide-x divide-border" style={{ height: 220 }}>
          {/* Hours */}
          <div className="flex flex-col w-[88px]">
            <p className="text-[10px] font-bold text-muted-foreground text-center py-1.5 border-b border-border bg-muted/40 uppercase tracking-widest shrink-0">
              Hora
            </p>
            {/* Native overflow-y-auto → scroll works with mouse wheel anywhere */}
            <div
              ref={hourColRef}
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{ scrollbarWidth: 'thin' }}
            >
              <div className="flex flex-col py-1 px-1.5">
                {hours.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => selectHour(h)}
                    style={{ height: ITEM_H }}
                    className={cn(
                      'w-full rounded-lg text-sm font-mono font-medium transition-colors flex items-center justify-center shrink-0',
                      selH === h
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'text-foreground/70 hover:bg-muted'
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Minutes */}
          <div className="flex flex-col w-[88px]">
            <p className="text-[10px] font-bold text-muted-foreground text-center py-1.5 border-b border-border bg-muted/40 uppercase tracking-widest shrink-0">
              Min
            </p>
            <div
              ref={minColRef}
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{ scrollbarWidth: 'thin' }}
            >
              <div className="flex flex-col py-1 px-1.5">
                {minutes.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => selectMinute(m)}
                    style={{ height: ITEM_H }}
                    className={cn(
                      'w-full rounded-lg text-sm font-mono font-medium transition-colors flex items-center justify-center shrink-0',
                      selM === m
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'text-foreground/70 hover:bg-muted'
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
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
