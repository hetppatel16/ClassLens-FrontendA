"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TeacherSubjectMappingDialogProps {
  token: string | null;
  teacher: {
    id: string;
    name: string;
  } | null;
  onClose: () => void;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Division {
  id: number;
  name: string;
  year: number;
}

export function TeacherSubjectMappingDialog({
  token,
  teacher,
  onClose,
}: TeacherSubjectMappingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!teacher || !token) return;
    fetchMappingDetails();
  }, [teacher, token, selectedDivision]);

  const fetchMappingDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const divisionParam = selectedDivision ? `&division_id=${selectedDivision}` : "";
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/teacher-subjects/mapping-details/?teacher_id=${teacher?.id}${divisionParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setDivisions(data.divisions || []);
        setSubjects(data.subjects || []);
        setSelectedSubjects(data.mapped_subjects || []);
      } else {
        setError("Failed to fetch teacher mapping details.");
      }
    } catch (err) {
      setError("Network error fetching mapping details.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (subjectId: number) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/teacher-subjects/bulk-assign/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            teacher_id: Number(teacher?.id),
            subject_ids: selectedSubjects,
            division_id: selectedDivision ? Number(selectedDivision) : null,
          }),
        }
      );

      if (response.ok) {
        setSuccess("Mapping updated successfully!");
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save mapping.");
      }
    } catch (err) {
      setError("Network error saving mappings.");
    } finally {
      setSaving(false);
    }
  };

  if (!teacher) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-foreground mb-1">
          Map Subjects to {teacher.name}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Assign multiple subjects to this teacher
        </p>

        {loading ? (
          <p className="text-center p-6 text-muted-foreground">Loading details...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Select Division (Optional)
              </label>
              <select
                className="w-full p-2 border rounded bg-card border-border text-foreground"
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
              >
                <option value="">— All Divisions —</option>
                {divisions.map((div) => (
                  <option key={div.id} value={div.id}>
                    {div.year}th Year - Division {div.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Mapped Subjects
              </label>
              <div className="max-h-60 overflow-y-auto space-y-2.5 p-3 border rounded bg-muted/20 border-border">
                {subjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    No subjects available in teacher's department.
                  </p>
                ) : (
                  subjects.map((sub) => (
                    <label
                      key={sub.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-primary"
                        checked={selectedSubjects.includes(sub.id)}
                        onChange={() => handleCheckboxChange(sub.id)}
                      />
                      <span className="text-sm text-foreground">
                        {sub.name} <span className="text-xs text-muted-foreground">({sub.code})</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Mappings"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
