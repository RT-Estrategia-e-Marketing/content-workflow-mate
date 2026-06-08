import { Clock, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  optional?: boolean;
}

const ITEM_H = 40;

export default function TimePicker({ value, onChange, className, optional }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minColRef  = useRef<HTMLDivElement>(null);

  const [selH, selM] = value ? value.split(':') : ['', ''];

  const hours   = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  // Center selected item when popover opens
  useEffect(() => {
    if (!open) return;
    const center = (ref: React.RefObject<HTMLDivElement>, idx: number) => {
      if (!ref.current || idx < 0) return;
      ref.current.scrollTop = idx * ITEM_H - ref.current.clientHeight / 2 + ITEM_H / 2;
    };
    setTimeout(() => {
      center(hourColRef, selH ? parseInt(selH) : 0);
      center(minColRef,  selM ? parseInt(selM) : 0);
    }, 60);
  }, [open]);

  // Forward wheel events from child buttons to the scroll container
  const handleWheel = (ref: React.RefObject<HTMLDivElement>) => (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (ref.current) ref.current.scrollTop += e.deltaY;
  };

  const selectHour   = (h: string) => onChange(`${h}:${selM || '00'}`);
  const selectMinute = (m: string) => { onChange(`${selH || '12'}:${m}`); setOpen(false); };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const m = e.target.value.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      const hh = parseInt(m[1]), mm = parseInt(m[2]);
      if (hh <= 23 && mm <= 59) onChange(`${m[1].padStart(2,'0')}:${m[2]}`);
    }
  };

  const handleInputChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '');
    if (!digits) { onChange(''); return; }
    if (digits.length >= 4) {
      const hh = parseInt(digits.slice(0,2)), mm = parseInt(digits.slice(2,4));
      if (hh <= 23 && mm <= 59) { onChange(`${digits.slice(0,2)}:${digits.slice(2,4)}`); return; }
    }
    const m = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      const hh = parseInt(m[1]), mm = parseInt(m[2]);
      if (hh <= 23 && mm <= 59) onChange(`${m[1].padStart(2,'0')}:${m[2]}`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-10 px-3',
            'hover:bg-transparent hover:text-foreground hover:border-primary focus-visible:ring-primary/30',
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

        {/* Text input */}
        <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            inputMode="numeric"
            placeholder="ex: 14:30"
            defaultValue={value}
            onChange={e => handleInputChange(e.target.value)}
            onBlur={handleInputBlur}
            className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Columns */}
        <div className="flex divide-x divide-border" style={{ height: 240 }}>

          {/* ── Hours ── */}
          <div className="flex flex-col" style={{ width: 120 }}>
            <p className="text-[11px] font-bold text-muted-foreground text-center py-1.5 border-b border-border bg-muted/40 uppercase tracking-widest shrink-0">
              Hora
            </p>
            {/* Scroll container: onWheel on this div + all children forward to it */}
            <div
              ref={hourColRef}
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{ scrollbarWidth: 'thin' }}
            >
              <div
                className="flex flex-col py-1 px-2"
                onWheel={handleWheel(hourColRef)}
              >
                {hours.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => selectHour(h)}
                    style={{ height: ITEM_H, minHeight: ITEM_H }}
                    className={cn(
                      'w-full rounded-lg text-base font-mono font-medium transition-colors flex items-center justify-center shrink-0',
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

          {/* ── Minutes ── */}
          <div className="flex flex-col" style={{ width: 120 }}>
            <p className="text-[11px] font-bold text-muted-foreground text-center py-1.5 border-b border-border bg-muted/40 uppercase tracking-widest shrink-0">
              Min
            </p>
            <div
              ref={minColRef}
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{ scrollbarWidth: 'thin' }}
            >
              <div
                className="flex flex-col py-1 px-2"
                onWheel={handleWheel(minColRef)}
              >
                {minutes.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => selectMinute(m)}
                    style={{ height: ITEM_H, minHeight: ITEM_H }}
                    className={cn(
                      'w-full rounded-lg text-base font-mono font-medium transition-colors flex items-center justify-center shrink-0',
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

        {/* Footer — only shown when optional */}
        {optional && (
          <div className="flex items-center justify-end px-3 py-2 border-t border-border bg-muted/20">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpar horário
            </button>
          </div>
        )}

      </PopoverContent>
    </Popover>
  );
}
