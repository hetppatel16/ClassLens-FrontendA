"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { DivisionForm } from "../forms/division-form";

interface DivisionsPageProps {
  token: string | null;
}

export interface DivisionItem {
  id: number;
  name: string;
  department?: number | string | null;
  department_name?: string;
  year?: number | string | null;
}

interface DepartmentItem {
  id: number;
  name: string;
}

const normalizeDivision = (item: any): DivisionItem => ({
  id: Number(item.id ?? item.pk ?? item.division_id ?? 0),
  name: String(item.name ?? item.division_name ?? ""),
  department: item.department ?? item.department_id ?? item.dept ?? "",
  department_name: String(item.department_name ?? item.department?.name ?? item.dept_name ?? ""),
  year: item.year ?? "",
});

export function DivisionsPage({ token }: DivisionsPageProps) {
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDivision, setEditingDivision] = useState<DivisionItem | null>(
    null
  );

  const fetchDivisions = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/divisions/",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch divisions", response.status);
        setDivisions([]);
        return;
      }

      const data = await response.json();
      const list = Array.isArray(data)
        ? data
        : data?.results ?? data?.data ?? data?.items ?? [];
      setDivisions((list || []).map(normalizeDivision));
    } catch (err) {
      console.error("Divisions fetch error", err);
      setDivisions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    const fetchDepartments = async () => {
      try {
        const response = await fetch(
          process.env.NEXT_PUBLIC_BACKEND_URL + "/api/getDepartments/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          setDepartments([]);
          return;
        }

        const data = await response.json();
        const list = Array.isArray(data)
          ? data
          : data?.results ?? data?.data ?? data?.items ?? [];

        setDepartments(
          (list || []).map((d: any) => ({
            id: Number(d.id ?? d.pk ?? d.department_id ?? 0),
            name: String(d.name ?? d.department_name ?? d.title ?? String(d)),
          }))
        );
      } catch (err) {
        console.error("Departments fetch error", err);
        setDepartments([]);
      }
    };

    fetchDivisions();
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleDelete = async (id: number) => {
    if (!token) return;
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this division?"
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + `/api/admin/divisions/${id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        alert(`Delete failed: ${response.status} ${text}`);
        return;
      }

      setDivisions((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Division delete error", err);
      alert("Network error while deleting division");
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingDivision(null);
    fetchDivisions();
  };

  const filtered = divisions.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.department_name ?? "").toLowerCase().includes(q) ||
      departments.find((dept) => String(dept.id) === String(d.department))?.name
        ?.toLowerCase()
        .includes(q) ||
      String(d.year ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Divisions</h1>
          <p className="text-muted-foreground mt-1">
            Manage class divisions by department, year, and name
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingDivision(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Division
        </Button>
      </div>

      {showForm && (
        <DivisionForm
          token={token}
          division={editingDivision}
          onClose={handleFormClose}
        />
      )}

      <Card>
        <div className="p-6 border-b border-border">
          <Input
            placeholder="Search by name, department, or year..."
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
                  Department
                </th>
                <th className="text-left p-6 font-semibold text-foreground">
                  Year
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-6 text-center text-muted-foreground"
                  >
                    No divisions found
                  </td>
                </tr>
              ) : (
                filtered.map((division) => (
                  <tr
                    key={division.id}
                    className="border-b border-border hover:bg-muted/50 transition"
                  >
                    <td className="p-6 font-medium text-foreground">
                      {division.name}
                    </td>
                    <td className="p-6 text-muted-foreground">
                      {division.department_name ||
                        departments.find(
                          (dept) => String(dept.id) === String(division.department)
                        )?.name ||
                        String(division.department ?? "-")}
                    </td>
                    <td className="p-6 text-muted-foreground">
                      {String(division.year ?? "-")}
                    </td>
                    <td className="p-6">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingDivision(division);
                            setShowForm(true);
                          }}
                          className="text-primary"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(division.id)}
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
