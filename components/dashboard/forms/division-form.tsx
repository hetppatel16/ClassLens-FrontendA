"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import type { DivisionItem } from "../pages/divisions-page";

interface DivisionFormProps {
  token: string | null;
  division?: DivisionItem | null;
  onClose: () => void;
}

interface OptionItem {
  id: number;
  name: string;
}

export function DivisionForm({ token, division, onClose }: DivisionFormProps) {
  const [departments, setDepartments] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    department: String(division?.department ?? ""),
    year: String(division?.year ?? ""),
    name: division?.name ?? "",
  });

  useEffect(() => {
    setFormData({
      department: String(division?.department ?? ""),
      year: String(division?.year ?? ""),
      name: division?.name ?? "",
    });
  }, [division]);

  useEffect(() => {
    if (!token) return;

    const loadOptions = async () => {
      setOptionsLoading(true);
      try {
        const deptPromise = fetch(
          process.env.NEXT_PUBLIC_BACKEND_URL + "/api/getDepartments/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const deptRes = await deptPromise;
        if (deptRes.ok) {
          const data = await deptRes.json();
          const raw = Array.isArray(data)
            ? data
            : data?.results ?? data?.data ?? data?.items ?? [];
          setDepartments(
            (raw || []).map((d: any) => ({
              id: d.id ?? d.pk ?? d.department_id,
              name: d.name ?? d.department_name ?? String(d),
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load division options", err);
      } finally {
        setOptionsLoading(false);
      }
    };

    loadOptions();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError("");

    const payload: Record<string, unknown> = {
      department: Number(formData.department),
      year: Number(formData.year),
      name: formData.name,
    };

    try {
      const method = division ? "PUT" : "POST";
      const url = division
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/divisions/${division.id}/`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/divisions/`;

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const detail =
          data.detail ||
          Object.entries(data)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(" | ") ||
          "Failed to save division";
        setError(detail);
        return;
      }

      onClose();
    } catch (err) {
      console.error("Division save error", err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">
          {division ? "Edit Division" : "Add New Division"}
        </h2>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Department
            </label>
            <select
              className="w-full p-2 border rounded bg-background"
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              disabled={optionsLoading}
              required
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Year
            </label>
            <Input
              type="number"
              min={1}
              max={6}
              value={formData.year}
              onChange={(e) =>
                setFormData({ ...formData, year: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="A / B / C"
              required
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Division"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
