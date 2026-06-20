"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface StudentFormProps {
  token: string | null;
  student?: {
    id: string;
    name: string;
    email: string;
    prn: string;
    year: number | string;
    department?: number | string | { id: number; name: string } | null;
    division?: number | string | { id: number; name: string } | null;
  } | null;
  onClose: () => void;
}

interface DepartmentItem {
  id: number;
  name: string;
}

interface DivisionItem {
  id: number;
  name: string;
  department?: number | string | null;
  year?: number | string | null;
  semester?: number | string | null;
}

export function StudentForm({ token, student, onClose }: StudentFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    prn: "",
    year: "",
    department: "" as string | number,
    division: "" as string | number,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [deptsLoading, setDeptsLoading] = useState(false);
  const [divisionsLoading, setDivisionsLoading] = useState(false);

  useEffect(() => {
    // prefill when editing
    if (student) {
      setFormData({
        name: student.name ?? "",
        email: student.email ?? "",
        prn: String(student.prn ?? ""),
        year: String(student.year ?? ""),
        department:
          typeof student.department === "object"
            ? (student.department as any).id ?? ""
            : ((student.department ?? "") as string | number),
        division:
          typeof student.division === "object"
            ? (student.division as any).id ?? ""
            : ((student.division ?? "") as string | number),
      });
    }
  }, [student]);

  useEffect(() => {
    // fetch departments
    const fetchDepts = async () => {
      setDeptsLoading(true);
      try {
        const res = await fetch(
          process.env.NEXT_PUBLIC_BACKEND_URL + "/api/getDepartments/",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        if (!res.ok) {
          console.warn("Failed to fetch departments", res.status);
          setDepartments([]);
          return;
        }
        const data = await res.json();
        const normalized: DepartmentItem[] = (data || []).map((d: any) => ({
          id: d.id ?? d.pk ?? d.pk_id ?? d.department_id ?? d.pk,
          name: d.name ?? d.department_name ?? String(d),
        }));
        setDepartments(normalized);

        // If student.department was a string name, try to select matching id
        if (
          student &&
          student.department &&
          typeof student.department === "string"
        ) {
          const found = normalized.find((x) => x.name === student.department);
          if (found) setFormData((s) => ({ ...s, department: found.id }));
        }
      } catch (err) {
        console.error("Failed to load departments", err);
        setDepartments([]);
      } finally {
        setDeptsLoading(false);
      }
    };

    fetchDepts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const fetchDivisions = async () => {
      if (!token) return;
      setDivisionsLoading(true);
      try {
        const res = await fetch(
          process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/divisions/",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          console.warn("Failed to fetch divisions", res.status);
          setDivisions([]);
          return;
        }

        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : data?.results ?? data?.data ?? data?.items ?? [];

        const normalized: DivisionItem[] = (list || []).map((d: any) => ({
          id: d.id ?? d.pk ?? d.division_id,
          name: d.name ?? d.division_name ?? String(d),
          department: d.department ?? d.department_id ?? "",
          year: d.year ?? "",
          semester: d.semester ?? "",
        }));

        setDivisions(normalized);
      } catch (err) {
        console.error("Failed to load divisions", err);
        setDivisions([]);
      } finally {
        setDivisionsLoading(false);
      }
    };

    fetchDivisions();
  }, [token]);

  const filteredDivisions = divisions.filter((d) => {
    if (
      formData.department !== "" &&
      formData.department != null &&
      String(d.department ?? "") !== String(formData.department)
    ) {
      return false;
    }

    if (
      formData.year !== "" &&
      formData.year != null &&
      String(d.year ?? "") !== String(formData.year)
    ) {
      return false;
    }

    return true;
  });

  useEffect(() => {
    if (formData.division === "" || formData.division == null) return;
    const currentId = String(formData.division);
    const stillVisible = filteredDivisions.some((d) => String(d.id) === currentId);
    if (!stillVisible) {
      setFormData((prev) => ({ ...prev, division: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.department, formData.year, divisions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url = student
        ? process.env.NEXT_PUBLIC_BACKEND_URL +
          `/api/admin/students/${student.id}/`
        : process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/students/";

      const method = student ? "PUT" : "POST";

      // Build payload and convert department to number if possible
      const payload: any = {
        name: formData.name,
        email: formData.email,
        prn: formData.prn,
        year: formData.year,
      };
      if (formData.department !== "" && formData.department != null) {
        // ensure department is numeric id
        const deptId = Number(formData.department);
        payload.department = Number.isNaN(deptId)
          ? formData.department
          : deptId;
      }
      if (formData.division !== "" && formData.division != null) {
        const divisionId = Number(formData.division);
        payload.division = Number.isNaN(divisionId)
          ? formData.division
          : divisionId;
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // try to parse JSON error body (DRF serializer errors)
        let data: any = null;
        try {
          data = await response.json();
        } catch {
          // not JSON
        }

        if (data) {
          // If serializer errors are returned, show them
          if (typeof data === "object") {
            // Flatten common patterns: { field: [msg] } or { detail: msg }
            if (data.detail) {
              setError(String(data.detail));
            } else {
              // join field errors into one message
              const parts: string[] = [];
              for (const k of Object.keys(data)) {
                const v = (data as any)[k];
                if (Array.isArray(v)) parts.push(`${k}: ${v.join(", ")}`);
                else parts.push(`${k}: ${String(v)}`);
              }
              setError(parts.join(" | "));
            }
          } else {
            setError(String(data));
          }
        } else {
          setError("Failed to save student");
        }
        setLoading(false);
        return;
      }

      // success
      onClose();
    } catch (err) {
      console.error("Student save error:", err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">
          {student ? "Edit Student" : "Add New Student"}
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
              Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Roll Number
            </label>
            <Input
              value={formData.prn}
              onChange={(e) =>
                setFormData({ ...formData, prn: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Class (Year)
            </label>
            <Input
              value={formData.year}
              onChange={(e) =>
                setFormData({ ...formData, year: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Department
            </label>
            {deptsLoading ? (
              <Input value="Loading departments…" disabled />
            ) : (
              <select
                value={String(formData.department ?? "")}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              >
                <option value="">— Select department —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Division
            </label>
            {divisionsLoading ? (
              <Input value="Loading divisions..." disabled />
            ) : (
              <select
                value={String(formData.division ?? "")}
                onChange={(e) =>
                  setFormData({ ...formData, division: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              >
                <option value="">— Select division —</option>
                {filteredDivisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.semester ? ` (Sem ${d.semester})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Student"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
