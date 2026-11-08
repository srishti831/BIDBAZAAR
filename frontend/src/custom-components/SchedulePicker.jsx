import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Clock, Zap } from "lucide-react";
import { serverNow } from "@/lib/time";

const DURATIONS = [
  { label: "1 day", ms: 1 * 24 * 3600e3 },
  { label: "3 days", ms: 3 * 24 * 3600e3 },
  { label: "7 days", ms: 7 * 24 * 3600e3 },
  { label: "14 days", ms: 14 * 24 * 3600e3 },
];

// Returns an error message, or null when the schedule is acceptable.
export const validateSchedule = ({ startNow, start, end }) => {
  const now = serverNow();
  if (!startNow && !start) return "Choose when the auction should start.";
  if (!end) return "Choose when the auction should end.";
  const startMs = startNow ? now : start.getTime();
  if (!startNow && startMs < now - 5 * 60e3) return "The start time is in the past.";
  if (end.getTime() - startMs < 5 * 60 * 1000) return "An auction must run for at least 5 minutes.";
  if (end.getTime() - startMs > 30 * 24 * 3600e3) return "An auction can run for 30 days at most.";
  return null;
};

export const scheduleToPayload = ({ startNow, start, end }) => ({
  startNow: !!startNow,
  startTime: startNow || !start ? undefined : start.toISOString(),
  endTime: end ? end.toISOString() : undefined,
});

const SchedulePicker = ({ value, onChange }) => {
  const { startNow, start, end } = value;
  const set = (patch) => onChange({ ...value, ...patch });
  const base = startNow ? serverNow() : start?.getTime();

  return (
    <div className="space-y-4">
      <div>
        <span className="label">When should bidding open?</span>
        <div className="inline-flex rounded-xl border border-ink-500 bg-ink-900/70 p-1">
          <button
            type="button"
            onClick={() => set({ startNow: true })}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              startNow ? "bg-bid text-white" : "text-dim hover:text-fg"
            }`}
          >
            <Zap size={14} /> Start now
          </button>
          <button
            type="button"
            onClick={() => set({ startNow: false })}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              !startNow ? "bg-bid text-white" : "text-dim hover:text-fg"
            }`}
          >
            <Clock size={14} /> Schedule
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {!startNow && (
          <div>
            <label className="label">Start time</label>
            <DatePicker
              selected={start}
              onChange={(date) => set({ start: date })}
              minDate={new Date()}
              filterTime={(t) => new Date(t).getTime() > Date.now()}
              showTimeSelect
              timeIntervals={15}
              dateFormat="d MMM yyyy, h:mm aa"
              placeholderText="Pick date & time"
              className="input"
            />
          </div>
        )}
        <div className={startNow ? "sm:col-span-2" : ""}>
          <label className="label">End time</label>
          <DatePicker
            selected={end}
            onChange={(date) => set({ end: date })}
            minDate={start || new Date()}
            filterTime={(t) => new Date(t).getTime() > Date.now()}
            showTimeSelect
            timeIntervals={15}
            dateFormat="d MMM yyyy, h:mm aa"
            placeholderText="Pick date & time"
            className="input"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.label}
                type="button"
                disabled={!base}
                onClick={() => set({ end: new Date(base + d.ms) })}
                className="chip disabled:opacity-40"
              >
                {d.label}
              </button>
            ))}
          </div>
          {!startNow && !start && <p className="hint">Pick a start time to use the quick durations.</p>}
        </div>
      </div>
    </div>
  );
};

export default SchedulePicker;
