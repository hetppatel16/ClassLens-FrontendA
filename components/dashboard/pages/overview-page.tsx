"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Award } from "lucide-react";

interface OverviewPageProps {
  token: string | null;
}

interface Stats {
  teachers_count: number;
  students_count: number;
  subjects_count: number;
}

export function OverviewPage({ token }: OverviewPageProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncSuccess, setSyncSuccess] = useState("");

  useEffect(() => {
    if (!token) return;

    const fetchStats = async () => {
      try {
        const response = await fetch(
          process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/stats/",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.log("[v0] Stats fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  const handleSync = async () => {
    if (!token) return;
    setSyncError("");
    setSyncSuccess("");
    setSyncLoading(true);

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/sync/staging/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      const text = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (!response.ok) {
        const message =
          (data && (data.detail || data.error || data.message)) ||
          (typeof data === "string" ? data : "Sync failed");
        setSyncError(String(message));
        return;
      }

      const message =
        (data && (data.message || data.detail || data.status)) ||
        "Sync completed successfully";
      setSyncSuccess(String(message));
    } catch (err) {
      console.log("[v0] Sync error:", err);
      setSyncError("Network error while running sync");
    } finally {
      setSyncLoading(false);
    }
  };

  const statCards = [
    {
      title: "Teachers",
      count: stats?.teachers_count || 0,
      icon: Users,
      color: "bg-blue-50 dark:bg-blue-950 text-blue-600",
    },
    {
      title: "Students",
      count: stats?.students_count || 0,
      icon: Award,
      color: "bg-green-50 dark:bg-green-950 text-green-600",
    },
    {
      title: "Subjects",
      count: stats?.subjects_count || 0,
      icon: BookOpen,
      color: "bg-purple-50 dark:bg-purple-950 text-purple-600",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to ClassLens Admin Panel
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {loading ? "-" : stat.count}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground">
            Use the sidebar to manage teachers, students, subjects, and
            enrollments. Run a sync after bulk uploads to move staging data into
            the live tables.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={handleSync} disabled={syncLoading || !token}>
              {syncLoading ? "Syncing..." : "Sync Staging Data"}
            </Button>
            {!token && (
              <span className="text-xs text-muted-foreground">
                Login required
              </span>
            )}
          </div>
          {syncError && (
            <div className="text-sm text-destructive">{syncError}</div>
          )}
          {syncSuccess && (
            <div className="text-sm text-green-600">{syncSuccess}</div>
          )}
        </div>
      </Card>
    </div>
  );
}
