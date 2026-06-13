"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle, X, UploadCloud } from "lucide-react";

interface StudentBulkUploadDialogProps {
  token: string | null;
  onClose: () => void;
}

interface Department {
  id: number;
  name: string;
}

interface Division {
  id: number;
  name: string;
  year: number;
  department_name?: string;
  department?: number;
}

export function StudentBulkUploadDialog({
  token,
  onClose,
}: StudentBulkUploadDialogProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  const [selectedDept, setSelectedDept] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchOptions();
  }, [token]);

  const fetchOptions = async () => {
    try {
      const deptRes = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + "/api/getDepartments/",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (deptRes.ok) {
        setDepartments(await deptRes.json());
      }

      const divRes = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/divisions/",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (divRes.ok) {
        const data = await divRes.json();
        setDivisions(data.results || data);
      }
    } catch (err) {
      console.error("Failed to fetch wizard options:", err);
    }
  };

  // Filter divisions to only those belonging to the selected department and year
  const filteredDivisions = divisions.filter((div) => {
    const matchDept = !selectedDept || String(div.department) === selectedDept;
    const matchYear = !selectedYear || String(div.year) === selectedYear;
    return matchDept && matchYear;
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setError("Please upload a CSV or Excel (.xlsx/.xls) file");
      setFile(null);
      return;
    }
    setError("");
    setFile(selectedFile);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedDept || !selectedDivision || !selectedYear) {
      setError("Please select Department, Year, and Division first.");
      return;
    }
    if (!file) {
      setError("Please select or drop a file to upload.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("department", selectedDept);
      formData.append("division", selectedDivision);
      formData.append("program", "");

      const endpoint = process.env.NEXT_PUBLIC_BACKEND_URL + "/api/students/bulk-upload/";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || "Bulk upload completed successfully.");
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(data.error || "Failed to process bulk upload.");
      }
    } catch (err) {
      setError("Network error while uploading students file.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCsvTemplate = () => {
    const headers = ["prn", "name", "email"];
    const example = [2021001, "Alice Johnson", "alice@example.com"];
    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_upload_template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // Step check to reveal the drop zone
  const stepCompleted =
    selectedDept !== "" &&
    selectedYear !== "" &&
    selectedDivision !== "";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-between items-start mb-6 mr-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-0.5">
              Student Bulk Upload Wizard
            </h2>
            <p className="text-sm text-muted-foreground">
              Step-by-step student bulk registration
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadCsvTemplate}
            className="flex-shrink-0 animate-fade-in"
          >
            Download Template
          </Button>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Department *
              </label>
              <select
                className="w-full p-2 border rounded bg-card border-border text-foreground"
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setSelectedDivision(""); // reset division if dept changes
                }}
                required
              >
                <option value="">— Select —</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Year *
              </label>
              <select
                className="w-full p-2 border rounded bg-card border-border text-foreground"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSelectedDivision(""); // reset division if year changes
                }}
                required
              >
                <option value="">— Select —</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Division *
              </label>
              <select
                className="w-full p-2 border rounded bg-card border-border text-foreground"
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                required
                disabled={!selectedDept || !selectedYear}
              >
                <option value="">— Select —</option>
                {filteredDivisions.length === 0 ? (
                  <option value="" disabled>No divisions found</option>
                ) : (
                  filteredDivisions.map((div) => (
                    <option key={div.id} value={div.id}>
                      Div {div.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {stepCompleted && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                dragActive ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <input
                id="student-wizard-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="student-wizard-file" className="cursor-pointer block">
                <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-foreground font-medium">
                  {file ? file.name : "Drag & drop your CSV or Excel file here"}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Or click to browse files
                </p>
              </label>
            </div>
          )}

          {error && (
            <div className="flex gap-2 items-start p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex gap-2 items-start p-3 bg-green-50 text-green-600 rounded-md text-sm">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file || loading || !stepCompleted}>
              {loading ? "Processing..." : "Run Upload"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
