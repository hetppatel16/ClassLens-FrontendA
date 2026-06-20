"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { StudentForm } from "../forms/student-form";
import { StudentBulkUploadDialog } from "../dialogs/student-bulk-upload-dialog";

interface StudentsPageProps {
  token: string | null;
}

interface Student {
  id: string;
  apiId?: string;
  name: string;
  email: string;
  prn: string;
  year: number | string;
  department?: number | string | null;
  department_name?: string | null;
  division?: number | string | null;
  division_name?: string | null;
  semester?: number | string | null;
  source: "live" | "staging";
}

interface DepartmentItem {
  id: number;
  name: string;
}

export function StudentsPage({ token }: StudentsPageProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [deptFilter, setDeptFilter] = useState<string | number>("");
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // client-side pagination over full loaded dataset
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  const fetchAllPages = async (url: string, tokenValue: string) => {
    const rows: any[] = [];
    let nextUrl: string | null = url;
    let safetyCounter = 0;

    while (nextUrl && safetyCounter < 500) {
      safetyCounter += 1;

      const res: Response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${tokenValue}` },
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

  const normalizeLiveStudent = (s: any): Student => ({
    id: String(s.id ?? s.pk ?? s.student_id ?? ""),
    apiId: String(s.id ?? s.pk ?? s.student_id ?? ""),
    name: s.name ?? s.full_name ?? "",
    email: s.email ?? s.email_id ?? "",
    prn: String(s.prn ?? s.roll_number ?? s.roll_no ?? ""),
    year: s.year ?? s.class ?? s.year_of ?? "",
    department: s.department ?? s.department_id ?? "",
    department_name:
      s.department_name ??
      s.department?.name ??
      (typeof s.department === "string" ? s.department : ""),
    division: s.division ?? s.division_id ?? "",
    division_name:
      s.division_name ??
      s.division?.name ??
      (typeof s.division === "string" ? s.division : ""),
    semester: s.semester ?? s.division?.semester ?? "",
    source: "live",
  });

  const normalizeStagingStudent = (s: any): Student => {
    const raw = s.raw_payload && typeof s.raw_payload === "object" ? s.raw_payload : {};
    return {
      id: `staging-${String(s.id ?? s.pk ?? s.prn ?? "")}`,
      apiId: String(s.id ?? s.pk ?? ""),
      name: s.full_name ?? s.name ?? raw.full_name ?? raw.name ?? "",
      email: s.email_id ?? s.email ?? raw.email_id ?? raw.email ?? "",
      prn: String(s.prn ?? raw.prn ?? ""),
      year: s.year ?? raw.year ?? raw.class ?? "",
      department: s.department ?? s.department_id ?? raw.department_id ?? "",
      department_name:
        s.department_name ?? raw.department_name ?? raw.department ?? "",
      division: s.division ?? s.division_id ?? raw.division_id ?? "",
      division_name:
        s.division_name ?? raw.division_name ?? raw.division ?? "",
      semester: s.semester ?? raw.semester ?? "",
      source: "staging",
    };
  };

  // fetch all students whenever token changes
  useEffect(() => {
    if (!token) return;
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // fetch departments once per token
  useEffect(() => {
    if (!token) return;
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchStudents = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const [liveRows, stagingRows] = await Promise.all([
        fetchAllPages(`${base}/api/admin/students/?page=1`, token),
        fetchAllPages(`${base}/api/admin/api-students/?page=1`, token).catch(
          () => []
        ),
      ]);

      const byPrn = new Map<string, Student>();

      for (const row of liveRows || []) {
        const normalized = normalizeLiveStudent(row);
        const key = normalized.prn || normalized.id;
        byPrn.set(key, normalized);
      }

      for (const row of stagingRows || []) {
        const normalized = normalizeStagingStudent(row);
        const key = normalized.prn || normalized.id;
        if (!byPrn.has(key)) {
          byPrn.set(key, normalized);
          continue;
        }

        // backfill missing live fields from staging raw/new_schema data
        const existing = byPrn.get(key)!;
        byPrn.set(key, {
          ...existing,
          name: existing.name || normalized.name,
          email: existing.email || normalized.email,
          year: existing.year || normalized.year,
          department_name: existing.department_name || normalized.department_name,
          division_name: existing.division_name || normalized.division_name,
          semester: existing.semester || normalized.semester,
        });
      }

      const merged = Array.from(byPrn.values());
      setStudents(merged);
      setTotalCount(merged.length);
      setPage(1);
    } catch (err) {
      console.log("[v0] Students fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    if (!token) return;
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + "/api/getDepartments/",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) return;
      const data = await res.json();
      const normalized = (data || []).map((d: any) => ({
        id: d.id ?? d.pk ?? d.department_id ?? d.pk,
        name: d.name ?? d.department_name ?? d.title ?? String(d),
      }));
      setDepartments(normalized);
    } catch (err) {
      console.error("failed to fetch departments", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this student?"
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + `/api/admin/students/${id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setStudents((prev) => prev.filter((s) => s.id !== id));
        setTotalCount((prev) => Math.max(0, prev - 1));
        // optionally, you can refetch the current page:
        // fetchStudents(page)
      } else {
        console.error("Delete failed", response.status);
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
    setEditingStudent(null);
    fetchStudents();
  };

  const filteredStudents = students.filter((s) => {
    if (yearFilter) {
      const sy = String(s.year ?? "").toLowerCase();
      if (sy !== String(yearFilter).toLowerCase()) return false;
    }

    if (deptFilter) {
      const df = String(deptFilter);
      if (String(s.department) === df) {
        // match by id, ok
      } else {
        if (
          !(
            (s.department_name ?? "")
              .toLowerCase()
              .includes(df.toLowerCase()) ||
            String(s.department ?? "").toLowerCase() === df.toLowerCase()
          )
        ) {
          return false;
        }
      }
    }

    if (search && search.trim() !== "") {
      const q = search.toLowerCase().trim();
      const nameMatch = s.name?.toLowerCase().includes(q);
      const emailMatch = s.email?.toLowerCase().includes(q);
      const prnMatch = String(s.prn ?? "")
        .toLowerCase()
        .includes(q);
      const deptNameMatch = (s.department_name ?? "").toLowerCase().includes(q);
      const divisionNameMatch = (s.division_name ?? "").toLowerCase().includes(q);

      return Boolean(
        nameMatch ||
          emailMatch ||
          prnMatch ||
          deptNameMatch ||
          divisionNameMatch
      );
    }

    return true;
  });

  const totalPages =
    filteredStudents.length > 0
      ? Math.ceil(filteredStudents.length / pageSize)
      : 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedStudents = filteredStudents.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const handlePrev = () => {
    if (page > 1) setPage((p) => p - 1);
  };

  const handleNext = () => {
    if (page < totalPages) setPage((p) => p + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground mt-1">Manage student records</p>
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
              setEditingStudent(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </Button>
        </div>
      </div>

      {showForm && (
        <StudentForm
          token={token}
          student={editingStudent}
          onClose={handleFormClose}
        />
      )}

      {showBulkUpload && (
        <StudentBulkUploadDialog
          token={token}
          onClose={() => {
            setShowBulkUpload(false);
            fetchStudents();
          }}
        />
      )}

      <Card>
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="Search by name, email, PRN, department, division..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="p-2 border rounded bg-background"
            >
              <option value="">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>

            <select
              value={String(deptFilter ?? "")}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="p-2 border rounded bg-background"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages} • Showing {pagedStudents.length} of {totalCount} students (live + staging)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left p-6 font-semibold text-foreground">Name</th>
                <th className="text-left p-6 font-semibold text-foreground">Email</th>
                <th className="text-left p-6 font-semibold text-foreground">Roll Number</th>
                <th className="text-left p-6 font-semibold text-foreground">Year</th>
                <th className="text-left p-6 font-semibold text-foreground">Department</th>
                <th className="text-left p-6 font-semibold text-foreground">Division</th>
                <th className="text-right p-6 font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                      colSpan={7}
                      className="p-6 text-center text-muted-foreground"
                    >
                    Loading...
                  </td>
                </tr>
              ) : pagedStudents.length === 0 ? (
                <tr>
                  <td
                      colSpan={7}
                      className="p-6 text-center text-muted-foreground"
                    >
                    No students found
                  </td>
                </tr>
              ) : (
                pagedStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-border hover:bg-muted/50 transition"
                  >
                    <td className="p-6 font-medium text-foreground">
                      {student.name}
                    </td>
                    <td className="p-6 text-muted-foreground">
                      {student.email}
                    </td>
                    <td className="p-6 text-muted-foreground">{student.prn}</td>
                    <td className="p-6 text-muted-foreground">
                      {student.year}
                    </td>
                    <td className="p-6 text-muted-foreground">
                      {student.department_name ??
                        String(student.department ?? "-")}
                    </td>
                    <td className="p-6 text-muted-foreground">
                      {student.division_name ?? String(student.division ?? "-")}
                    </td>
                    {/* Semester and Source hidden in table */}
                    <td className="p-6">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (student.source === "staging") {
                              alert(
                                "This row is from staging (new_schema). Promote/sync to live students before editing."
                              );
                              return;
                            }
                            setEditingStudent(student);
                            setShowForm(true);
                          }}
                          className="text-primary"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (student.source === "staging") {
                              alert(
                                "Staging rows are managed from sync flow. Delete from staging endpoint if needed."
                              );
                              return;
                            }
                            handleDelete(student.id);
                          }}
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

        {/* Pagination controls */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <Button variant="outline" onClick={handlePrev} disabled={page <= 1}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={handleNext}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      </Card>
    </div>
  );
}
