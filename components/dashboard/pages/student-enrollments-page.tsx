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

interface SubjectItem {
  id: number;
  code: string;
  name: string;
}

const fetchAllPages = async (url: string, token: string) => {
  const rows: any[] = [];
  let nextUrl: string | null = url;
  let safetyCounter = 0;

  while (nextUrl && safetyCounter < 500) {
    safetyCounter += 1;
    const res: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status}`);
    }

    const dataVal: any = await res.json();
    const list = Array.isArray(dataVal)
      ? dataVal
      : dataVal.results ?? dataVal.data ?? dataVal.items ?? [];
    rows.push(...(list || []));

    if (Array.isArray(dataVal)) {
      nextUrl = null;
    } else {
      nextUrl = typeof dataVal.next === "string" ? dataVal.next : null;
    }
  }

  return rows;
};

export function StudentEnrollmentsPage({ token }: StudentEnrollmentsPageProps) {
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingEnrollment, setEditingEnrollment] =
    useState<StudentEnrollment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const [subjectRows, enrollmentRows] = await Promise.all([
        fetchAllPages(`${baseUrl}/api/admin/subjects/?page=1`, token),
        fetchAllPages(`${baseUrl}/api/admin/student-enrollments/?page=1`, token),
      ]);

      const subjectMap = new Map<number, SubjectItem>();
      const normalizedSubjects: SubjectItem[] = subjectRows.map((x: any) => ({
        id: Number(x.id ?? x.pk ?? x.subject_id ?? 0),
        code: String(x.code ?? x.subject_code ?? x.paper_code ?? ""),
        name: String(x.name ?? x.paper_name ?? x.title ?? ""),
      }));

      normalizedSubjects.forEach((s) => subjectMap.set(s.id, s));
      setSubjects(normalizedSubjects);

      const normalized: StudentEnrollment[] = enrollmentRows.map((e: any) => {
        const subjectId = Number(
          e.subject_id ?? e.subject ?? e.subject?.id ?? e.subject_pk ?? 0
        );

        const matchedSubject = subjectMap.get(subjectId);

        const subjectCode =
          e.subject_code ??
          e.subject?.code ??
          matchedSubject?.code ??
          String(e.subject ?? e.subject_id ?? "");

        const subjectName =
          e.subject_name ??
          e.subject?.name ??
          matchedSubject?.name ??
          "";

        return {
          id: Number(e.id ?? e.pk ?? e.enrollment_id ?? 0),
          student_prn: Number(e.student_prn ?? e.prn ?? 0),
          subject: subjectId,
          subject_name: subjectName,
          subject_code: subjectCode,
        };
      });

      setEnrollments(normalized);
    } catch (err) {
      console.log("[v0] Student enrollments fetch error:", err);
      setSubjects([]);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
    loadData();
  };

  // Search by PRN, subject name, or subject code
  const filteredEnrollments = enrollments.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();

    const prnMatch = String(e.student_prn).toLowerCase().includes(q);
    const subjectNameMatch = (e.subject_name ?? "").toLowerCase().includes(q);
    const subjectCodeMatch = (e.subject_code ?? "").toLowerCase().includes(q);
    const subjectIdMatch = String(e.subject).toLowerCase().includes(q);

    return prnMatch || subjectNameMatch || subjectCodeMatch || subjectIdMatch;
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
            loadData();
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
