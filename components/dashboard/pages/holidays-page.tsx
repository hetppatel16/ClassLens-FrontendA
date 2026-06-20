"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Trash2, ShieldAlert, Sparkles, Plus, AlertTriangle } from "lucide-react";

interface HolidaysPageProps {
  token: string | null;
}

interface Holiday {
  id: number;
  date: string;
  name: string;
  is_working_day: boolean;
}

export function HolidaysPage({ token }: HolidaysPageProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Custom Holiday Form State
  const [customHoliday, setCustomHoliday] = useState({
    date: "",
    name: "",
    is_working_day: false,
  });

  useEffect(() => {
    fetchHolidays();
  }, [token]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        (process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000") + "/api/holidays/",
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setHolidays(data);
      } else {
        console.error("Failed to fetch holidays");
      }
    } catch (err) {
      console.error("Error fetching holidays:", err);
    } finally {
      setLoading(false);
    }
  };

  const declareEmergencyHoliday = async () => {
    setActionLoading(true);
    setMessage(null);

    const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
    const holidayData = {
      date: today,
      name: "Emergency Closure / Strike",
      is_working_day: false,
    };

    try {
      const response = await fetch(
        (process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000") + "/api/holidays/create/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(holidayData),
        }
      );

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Emergency Holiday Declared! All attendance is now locked for today.",
        });
        fetchHolidays();
      } else {
        const errData = await response.json().catch(() => ({}));
        setMessage({
          type: "error",
          text: errData.error || "Failed to declare emergency holiday. It might already exist.",
        });
      }
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: "An error occurred while communicating with the server.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddCustomHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customHoliday.date || !customHoliday.name) {
      setMessage({ type: "error", text: "Please provide both date and name." });
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        (process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000") + "/api/holidays/create/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(customHoliday),
        }
      );

      if (response.ok) {
        setMessage({
          type: "success",
          text: `Holiday "${customHoliday.name}" declared successfully!`,
        });
        setCustomHoliday({ date: "", name: "", is_working_day: false });
        fetchHolidays();
      } else {
        const errData = await response.json().catch(() => ({}));
        setMessage({
          type: "error",
          text: errData.error || "Failed to add holiday. It might already exist on this date.",
        });
      }
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: "An error occurred while communicating with the server.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!confirm("Are you sure you want to remove this holiday?")) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        (process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000") + `/api/holidays/${id}/`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Holiday deleted successfully.",
        });
        fetchHolidays();
      } else {
        setMessage({
          type: "error",
          text: "Failed to delete holiday.",
        });
      }
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: "An error occurred while deleting the holiday.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Holiday Management</h1>
          <p className="text-muted-foreground mt-1">
            Declare academic holidays and emergency closures to prevent invalid attendance records.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg border text-sm flex items-start gap-3 transition-all duration-300 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30"
              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
          }`}
        >
          <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{message.text}</div>
        </div>
      )}

      {/* Grid of Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Emergency Override (The Red Button) */}
        <Card className="p-6 border-red-200 bg-gradient-to-br from-card to-red-50/20 dark:to-red-950/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-xl font-semibold">Emergency Override</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Instantly lock all teacher and attendance apps for today. This declares today a non-working day due to unexpected floods, extreme weather, university strikes, or other emergency situations.
            </p>
          </div>
          
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Affects all active schedules for today
            </span>
            <Button
              onClick={declareEmergencyHoliday}
              disabled={actionLoading}
              variant="destructive"
              className="px-6 py-5 h-auto text-sm font-semibold shadow-md bg-red-600 hover:bg-red-700 hover:shadow-red-500/20 dark:hover:shadow-none transition-all duration-200"
            >
              {actionLoading ? "Processing..." : "Declare Emergency Holiday for Today"}
            </Button>
          </div>
        </Card>

        {/* Custom Holiday Planner */}
        <Card className="p-6">
          <div className="flex items-center gap-3 text-primary mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Schedule a Holiday</h2>
          </div>
          
          <form onSubmit={handleAddCustomHoliday} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Holiday Date
              </label>
              <Input
                type="date"
                required
                value={customHoliday.date}
                onChange={(e) => setCustomHoliday({ ...customHoliday, date: e.target.value })}
                className="w-full bg-background"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Holiday Name / Description
              </label>
              <Input
                type="text"
                placeholder="e.g. Diwali Vacation, Independence Day, Sports Meet"
                required
                value={customHoliday.name}
                onChange={(e) => setCustomHoliday({ ...customHoliday, name: e.target.value })}
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="is_working_day"
                checked={customHoliday.is_working_day}
                onChange={(e) => setCustomHoliday({ ...customHoliday, is_working_day: e.target.checked })}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="is_working_day" className="text-sm font-medium text-foreground cursor-pointer select-none">
                Is Working Day (Allows class attendance despite holiday status)
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={actionLoading} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {actionLoading ? "Adding..." : "Add Holiday"}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Holidays List */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground">Declared Holidays</h2>
          <p className="text-xs text-muted-foreground mt-0.5">List of all scheduled non-working and working holidays.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/10">
              <tr>
                <th className="text-left p-6 font-semibold text-foreground text-sm">Date</th>
                <th className="text-left p-6 font-semibold text-foreground text-sm">Holiday Name</th>
                <th className="text-left p-6 font-semibold text-foreground text-sm">Type</th>
                <th className="text-right p-6 font-semibold text-foreground text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground text-sm">
                    Loading holidays list...
                  </td>
                </tr>
              ) : holidays.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground text-sm">
                    No holidays declared yet.
                  </td>
                </tr>
              ) : (
                holidays.map((holiday) => (
                  <tr key={holiday.id} className="border-b border-border hover:bg-muted/50 transition">
                    <td className="p-6 text-sm font-medium text-foreground">{holiday.date}</td>
                    <td className="p-6 text-sm text-foreground">{holiday.name}</td>
                    <td className="p-6 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          holiday.is_working_day
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {holiday.is_working_day ? "Working Day" : "Non-Working Day"}
                      </span>
                    </td>
                    <td className="p-6 text-sm text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleDeleteHoliday(holiday.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
