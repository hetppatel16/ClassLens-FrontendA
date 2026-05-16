"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { StudentEnrollmentForm } from "../forms/student-enrollment-form";
import { BulkUploadDialog } from "../dialogs/bulk-upload-dialog";

interface StudentEnrollmentsPageProps {
  token: string | null;
}

interface StudentEnrollment {
  id: number;
  student_prn: number;
  subject: number;
  subject_name: string;
  subject_code: string;
}

export function StudentEnrollmentsPage({ token }: StudentEnrollmentsPageProps) {
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingEnrollment, setEditingEnrollment] =
    useState<StudentEnrollment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchEnrollments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchEnrollments = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/student-enrollments/",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();

        const rawList = Array.isArray(data)
          ? data
          : data?.results ?? data?.data ?? data?.items ?? [];

        const normalized: StudentEnrollment[] = (rawList || []).map((e: any) => ({
          id: e.id ?? e.pk ?? null,
          // support both 'student_prn' and 'prn' from different tables
          student_prn: e.student_prn ?? e.prn ?? e.student_prn,
          // subject may be numeric id (subject / subject_id) or a subject_code string from apienrollment
          subject: e.subject ?? e.subject_id ?? (typeof e.subject === "number" ? e.subject : null),
          subject_name: e.subject_name ?? (e.subject && e.subject.name) ?? "",
          subject_code:
            e.subject_code ?? (e.subject && e.subject.code) ?? (typeof e.subject === "string" ? e.subject : ""),
        }));

        setEnrollments(normalized);
      } else {
        console.error("Failed to fetch student enrollments:", response.status);
      }
    } catch (err) {
      console.log("[v0] Student enrollments fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this enrollment?"
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL +
          `/api/admin/student-enrollments/${id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setEnrollments((prev) => prev.filter((e) => e.id !== id));
      } else {
        console.error("Delete failed:", response.status);
        const text = await response.text().catch(() => "");
        alert(`Delete failed: ${response.status} ${text}`);
      }
    } catch (err) {
      console.log("[v0] Delete error:", err);
      alert("Network error while deleting");
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEnrollment(null);
    fetchEnrollments();
  };

  // Search by PRN, subject name, or subject code
  const filteredEnrollments = enrollments.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();

    const prnMatch = String(e.student_prn).toLowerCase().includes(q);
    const subjectNameMatch = (e.subject_name ?? "").toLowerCase().includes(q);
    const subjectCodeMatch = (e.subject_code ?? "").toLowerCase().includes(q);

    return prnMatch || subjectNameMatch || subjectCodeMatch;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Student Enrollments
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage which students are enrolled in which subjects
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </Button>
          <Button
            onClick={() => {
              setEditingEnrollment(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Enrollment
          </Button>
        </div>
      </div>

      {showForm && (
        <StudentEnrollmentForm
          token={token}
          enrollment={editingEnrollment}
          onClose={handleFormClose}
        />
      )}

      {showBulkUpload && (
        <BulkUploadDialog
          token={token}
          type="student-enrollments"
          onClose={() => {
            setShowBulkUpload(false);
            fetchEnrollments();
          }}
        />
      )}

      <Card>
        <div className="p-6 border-b border-border">
          <Input
            placeholder="Search by PRN, subject code, or subject name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left p-6 font-semibold text-foreground">
                  Student PRN
                </th>
                <th className="text-left p-6 font-semibold text-foreground">
                  Subject Code
                </th>
                <th className="text-left p-6 font-semibold text-foreground">
                  Subject Name
                </th>
                <th className="text-right p-6 font-semibold text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-6 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredEnrollments.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-6 text-center text-muted-foreground"
                  >
                    No enrollments found
                  </td>
                </tr>
              ) : (
                filteredEnrollments.map((enrollment) => (
                  <tr
                    key={enrollment.id}
                    className="border-b border-border hover:bg-muted/50 transition"
                  >
                    <td className="p-6 font-medium text-foreground">
                      {enrollment.student_prn}
                    </td>
                    <td className="p-6 text-muted-foreground">
                      {enrollment.subject_code}
                    </td>
                    <td className="p-6 text-muted-foreground">
                      {enrollment.subject_name}
                    </td>
                    <td className="p-6">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingEnrollment(enrollment);
                            setShowForm(true);
                          }}
                          className="text-primary"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(enrollment.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
