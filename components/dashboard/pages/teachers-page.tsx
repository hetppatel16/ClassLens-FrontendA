"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Upload, BookOpen } from "lucide-react";
import { TeacherForm } from "../forms/teacher-form";
import { BulkUploadDialog } from "../dialogs/bulk-upload-dialog";
import { TeacherSubjectMappingDialog } from "../dialogs/teacher-subject-mapping-dialog";

interface TeachersPageProps {
  token: string | null;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  department_name: string;
}


const normalizeTeachers = (payload: unknown): Teacher[] => {
  const container = payload as {
    results?: unknown;
    data?: unknown;
    items?: unknown;
  };

  const list = Array.isArray(payload)
    ? payload
    : container.results ?? container.data ?? container.items ?? [];

  if (!Array.isArray(list)) return [];

  return list.map((item: any) => ({
    id: String(item.id ?? item.pk ?? item.teacher_id ?? ""),
    name: String(item.name ?? item.full_name ?? ""),
    email: String(item.email ?? ""),
    phone: String(item.phone ?? item.phone_number ?? ""),
    department_name: String(
      item.department_name ?? item.department?.name ?? item.department ?? ""
    ),
  }));
};

export function TeachersPage({ token }: TeachersPageProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [mappingTeacher, setMappingTeacher] = useState<Teacher | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);


  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/teachers",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setTeachers(normalizeTeachers(data));
      }
    } catch (err) {
      console.log("[v0] Teachers fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this teacher?",
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + `/api/admin/teachers/${id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        setTeachers((prev) => prev.filter((t) => t.id !== id));
      } else {
        console.error("Delete failed:", await response.text());
      }
    } catch (err) {
      console.log("[v0] Delete error:", err);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTeacher(null);
    fetchTeachers();
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Teachers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your teaching staff
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
              setEditingTeacher(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Teacher
          </Button>
        </div>
      </div>

      {showForm && (
        <TeacherForm
          token={token}
          teacher={editingTeacher}
          onClose={handleFormClose}
        />
      )}

      {showBulkUpload && (
        <BulkUploadDialog
          token={token}
          type="teachers"
          onClose={() => {
            setShowBulkUpload(false);
            fetchTeachers();
          }}
        />
      )}

      <Card>
        <div className="p-6 border-b border-border">
          <Input
            placeholder="Search by name or email..."
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
                  Name
                </th>
                <th className="text-left p-6 font-semibold text-foreground">
                  Email
                </th>

                <th className="text-left p-6 font-semibold text-foreground">
                  Department
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
                    colSpan={5}
                    className="p-6 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-muted-foreground"
                  >
                    No teachers found
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr
                    key={teacher.id}
                    className="border-b border-border hover:bg-muted/50 transition"
                  >
                    <td className="p-6 font-medium text-foreground">
                      {teacher.name}
                    </td>
                    <td className="p-6 text-muted-foreground">
                      {teacher.email}
                    </td>

                    <td className="p-6 text-muted-foreground">
                      {teacher.department_name}
                    </td>
                    <td className="p-6">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMappingTeacher(teacher)}
                          className="text-foreground hover:text-primary flex items-center gap-1.5"
                          title="Map Subjects"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span className="hidden xl:inline text-xs">Map Subjects</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTeacher(teacher);
                            setShowForm(true);
                          }}
                          className="text-primary"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(teacher.id)}
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

      {mappingTeacher && (
        <TeacherSubjectMappingDialog
          token={token}
          teacher={mappingTeacher}
          onClose={() => setMappingTeacher(null)}
        />
      )}
    </div>
  );
}
