"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { SubjectForm } from "../forms/subject-form";
import { BulkUploadDialog } from "../dialogs/bulk-upload-dialog";

interface SubjectsPageProps {
  token: string | null;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
}

const normalizeSubjects = (payload: unknown): Subject[] => {
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
    id: String(item.id ?? item.pk ?? item.subject_id ?? ""),
    name: String(item.name ?? item.title ?? ""),
    code: String(item.code ?? item.subject_code ?? ""),
    description: String(item.description ?? item.desc ?? ""),
  }));
};

export function SubjectsPage({ token }: SubjectsPageProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, [token]);

  const fetchSubjects = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/subjects",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSubjects(normalizeSubjects(data));
      }
    } catch (err) {
      console.log("[v0] Subjects fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/admin/subjects/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setSubjects((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.log("[v0] Delete error:", err);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSubject(null);
    fetchSubjects();
  };

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subjects</h1>
          <p className="text-muted-foreground mt-1">Manage course subjects</p>
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
              setEditingSubject(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Subject
          </Button>
        </div>
      </div>

      {showForm && (
        <SubjectForm
          token={token}
          subject={editingSubject}
          onClose={handleFormClose}
        />
      )}

      {showBulkUpload && (
        <BulkUploadDialog
          token={token}
          type="subjects"
          onClose={() => {
            setShowBulkUpload(false);
            fetchSubjects();
          }}
        />
      )}

      <Card>
        <div className="p-6 border-b border-border">
          <Input
            placeholder="Search by name or code..."
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
                  Code
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
                    colSpan={3}
                    className="p-6 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredSubjects.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="p-6 text-center text-muted-foreground"
                  >
                    No subjects found
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((subject) => (
                  <tr
                    key={subject.id}
                    className="border-b border-border hover:bg-muted/50 transition"
                  >
                    <td className="p-6 font-medium text-foreground">
                      {subject.name}
                    </td>
                    <td className="p-6 text-muted-foreground">
                      {subject.code}
                    </td>
                    <td className="p-6">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingSubject(subject);
                            setShowForm(true);
                          }}
                          className="text-primary"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(subject.id)}
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
