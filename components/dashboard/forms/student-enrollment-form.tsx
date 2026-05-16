"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

interface StudentEnrollmentFormProps {
  token: string | null;
  enrollment?: {
    id: number;
    student_prn: number;
    subject: number;
    subject_name?: string;
    subject_code?: string;
  } | null;
  onClose: () => void;
}

interface SubjectItem {
  id: number;
  code: string;
  name: string;
}

export function StudentEnrollmentForm({
  token,
  enrollment,
  onClose,
}: StudentEnrollmentFormProps) {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [formData, setFormData] = useState({
    student_prn: enrollment?.student_prn ? String(enrollment.student_prn) : "",
    subject: enrollment?.subject ? String(enrollment.subject) : "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const fetchSubjects = async () => {
      try {
        const res = await fetch(
          process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/subjects/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) return console.error("Failed to fetch subjects");

        const data = await res.json();
        const raw = Array.isArray(data) ? data : data?.results ?? data?.data ?? data?.items ?? [];
        const normalized = (raw || []).map((x: any) => ({
          id: x.id ?? x.pk ?? x.subject_id,
          code: x.code ?? x.subject_code ?? String(x.code ?? x.subject_code ?? ""),
          name: x.name ?? x.title ?? String(x.name ?? x.title ?? ""),
        }));
        setSubjects(normalized);
      } catch (err) {
        console.error("[v0] subjects fetch error:", err);
      }
    };

    fetchSubjects();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError("");

    const method = enrollment ? "PUT" : "POST";
    const url = enrollment
      ? process.env.NEXT_PUBLIC_BACKEND_URL +
        `/api/admin/student-enrollments/${enrollment.id}/`
      : process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/student-enrollments/";

    const payload = {
      student_prn: Number(formData.student_prn),
      subject: Number(formData.subject),
    };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onClose();
      } else {
        const errData = await response.json();
        setError(errData.detail || "Enrollment already exists or invalid data");
      }
    } catch (err) {
      console.error("[v0] Form submit error:", err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">
              {enrollment ? "Edit Enrollment" : "Add Enrollment"}
            </h2>
            <button
              onClick={() => {
                setError("");
                onClose();
              }}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Student PRN
              </label>
              <Input
                required
                value={formData.student_prn}
                onChange={(e) =>
                  setFormData({ ...formData, student_prn: e.target.value })
                }
                placeholder="Enter PRN number"
                disabled={!!enrollment}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <select
                required
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                className="w-full border rounded p-2 bg-background"
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setError("");
                  onClose();
                }}
                className="flex-1 bg-transparent"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
