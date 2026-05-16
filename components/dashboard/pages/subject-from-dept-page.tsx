"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { SubjectFromDeptForm } from "../forms/subject-from-dept-form";
import { BulkUploadDialog } from "../dialogs/bulk-upload-dialog";

interface SubjectFromDeptPageProps {
  token: string | null;
}

interface SubjectDetail {
  id: number;
  code: string;
  name: string;
}

interface SubjectFromDept {
  id: number;
  department: number;
  department_name: string;
  year: number;
  semester: number;
  subject_details: SubjectDetail[];
}

export function SubjectFromDeptPage({ token }: SubjectFromDeptPageProps) {
  const [mappings, setMappings] = useState<SubjectFromDept[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingMapping, setEditingMapping] = useState<SubjectFromDept | null>(
    null
  );
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchMappings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMappings = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/subject-from-dept/",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();

        // support DRF pagination or wrapper objects: { results: [...] } or { data: [...] }
        const rawList = Array.isArray(data)
          ? data
          : data?.results ?? data?.data ?? data?.items ?? [];

        // Normalize into our TS interface shape
        const normalized: SubjectFromDept[] = (rawList || []).map((item: any) => ({
          id: item.id,
          department: item.department,
          department_name: item.department_name,
          year: item.year,
          semester: item.semester,
          subject_details: Array.isArray(item.subject_details)
            ? item.subject_details.map((s: any) => ({
                id: s.id,
                code: s.code,
                name: s.name,
              }))
            : [],
        }));

        setMappings(normalized);
      } else {
        console.error(
          "Failed to fetch subject-from-dept mappings:",
          response.status
        );
      }
    } catch (err) {
      console.log("[v0] Subject from dept fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this mapping?"
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL +
          `/api/admin/subject-from-dept/${id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setMappings((prev) => prev.filter((m) => m.id !== id));
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
    setEditingMapping(null);
    fetchMappings();
  };

  // search in department_name and subject_details (code + name)
  const filteredMappings = mappings.filter((m) => {
    if (!search.trim()) return true;

    const q = search.toLowerCase().trim();

    const deptMatch = m.department_name.toLowerCase().includes(q);

    const subjectsText = m.subject_details
      .map((s) => `${s.code} ${s.name}`)
      .join(" ")
      .toLowerCase();

    const subjectMatch = subjectsText.includes(q);

    return deptMatch || subjectMatch;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Subject to Department
          </h1>
          <p className="text-muted-foreground mt-1">
            Map subjects to departments, by year and semester
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
              setEditingMapping(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Mapping
          </Button>
        </div>
      </div>

      {showForm && (
        <SubjectFromDeptForm
          token={token}
          mapping={editingMapping}
          onClose={handleFormClose}
        />
      )}

      {showBulkUpload && (
        <BulkUploadDialog
          token={token}
          type="subject-from-dept"
          onClose={() => {
            setShowBulkUpload(false);
            fetchMappings();
          }}
        />
      )}

      <Card>
        <div className="p-6 border-b border-border">
          <Input
            placeholder="Search by subject code/name or department name..."
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
                  Department
                </th>
                <th className="text-left p-6 font-semibold text-foreground">
                  Year
                </th>
                <th className="text-left p-6 font-semibold text-foreground">
                  Semester
                </th>
                <th className="text-left p-6 font-semibold text-foreground">
                  Subjects
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
              ) : filteredMappings.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-muted-foreground"
                  >
                    No mappings found
                  </td>
                </tr>
              ) : (
                filteredMappings.map((mapping) => (
                  <tr
                    key={mapping.id}
                    className="border-b border-border hover:bg-muted/50 transition"
                  >
                    <td className="p-6 font-medium text-foreground">
                      {mapping.department_name}
                    </td>
                    <td className="p-6 text-muted-foreground">
                      {mapping.year}
                    </td>
                    <td className="p-6 text-muted-foreground">
                      {mapping.semester}
                    </td>
                    <td className="p-6 text-muted-foreground">
                      {mapping.subject_details.length === 0
                        ? "-"
                        : mapping.subject_details
                            .map((s) => `${s.code} – ${s.name}`)
                            .join(", ")}
                    </td>
                    <td className="p-6">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingMapping(mapping);
                            setShowForm(true);
                          }}
                          className="text-primary"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(mapping.id)}
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
