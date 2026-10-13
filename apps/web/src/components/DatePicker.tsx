import { useState, useRef, useEffect } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
}

export function DatePicker({ label, value, onChange, placeholder = "DD/MM/YYYY" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="relative" ref={ref}>
      <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-slate-800 font-bold z-10">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between pl-3 pr-3 py-2 border rounded-[8px] min-w-[140px] cursor-pointer bg-white relative",
          isOpen ? "border-slate-800 border-[1.5px]" : "border-slate-200"
        )}
      >
        <span className={cn("text-[12px] font-medium", value ? "text-slate-800" : "text-slate-400")}>
          {value ? format(value, 'dd/MM/yyyy') : placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-100 p-4 w-[280px] z-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1 cursor-pointer">
              <span className="font-bold text-slate-800 text-[13px]">{format(currentMonth, "MMMM yyyy")}</span>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex items-center gap-1">
              <ChevronLeft onClick={prevMonth} className="w-5 h-5 text-slate-500 cursor-pointer hover:bg-slate-100 rounded-full p-0.5 transition" />
              <ChevronRight onClick={nextMonth} className="w-5 h-5 text-slate-500 cursor-pointer hover:bg-slate-100 rounded-full p-0.5 transition" />
            </div>
          </div>
          <div className="grid grid-cols-7 mb-2 text-center">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-[11px] font-bold text-slate-400">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {days.map((day, i) => {
              const isSelected = value ? isSameDay(day, value) : false;
              const isCurrentMonth = isSameMonth(day, monthStart);
              return (
                <div key={i} className="flex items-center justify-center h-8">
                  <div
                    onClick={() => {
                      onChange(day);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-7 h-7 flex items-center justify-center text-[12px] rounded-full cursor-pointer transition-colors",
                      !isCurrentMonth && "text-slate-300",
                      isCurrentMonth && !isSelected && "text-slate-700 hover:bg-slate-100",
                      isSelected && "bg-blue-50 text-slate-800 font-medium border border-slate-400"
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
