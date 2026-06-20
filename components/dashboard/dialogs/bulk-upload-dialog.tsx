"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, X } from "lucide-react";

interface BulkUploadDialogProps {
  token: string | null;
  type:
    | "teachers"
    | "students"
    | "subjects"
    | "subject-from-dept"
    | "student-enrollments";
  onClose: () => void;
}

type TemplateSpec = {
  headers: string[];
  exampleRow: (string | number)[];
};

export function BulkUploadDialog({
  token,
  type,
  onClose,
}: BulkUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rowErrors, setRowErrors] = useState<Array<string>>([]);

  const TEMPLATES: Record<string, TemplateSpec> = {
    teachers: {
      headers: [
        "name",
        "email",
        "password",
        "department_name",
        "phone",
        "subject",
      ],
      exampleRow: [
        "John Doe",
        "john@example.com",
        "teacher123",
        "Computer Science",
        "9876543210",
        "CS101",
      ],
    },
    students: {
      headers: ["prn", "name", "email", "year", "department_name"],
      exampleRow: [2021001, "Alice Johnson", "alice@example.com", 2, "Computer Science"],
    },
    subjects: {
      headers: ["paper_code", "paper_name", "msuis_id"],
      exampleRow: ["CS101", "Data Structures", 10101],
    },
    "subject-from-dept": {
      headers: ["department_name", "year", "semester", "subject_codes"],
      exampleRow: ["Computer Science", 2, 3, "CS201,CS202"],
    },
    "student-enrollments": {
      headers: ["prn", "subject_code", "division", "year"],
      exampleRow: [2021001, "CS201", "SFI", 2],
    },
  };

  function resetMessages() {
    setError("");
    setSuccess("");
    setRowErrors([]);
  }

  // central close function: resets state and calls parent's onClose
  const closeDialog = () => {
    // reset local state
    setFile(null);
    setLoading(false);
    resetMessages();
    // notify parent to hide dialog
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetMessages();
    const selectedFile = e.target.files?.[0] ?? null;
    if (!selectedFile) {
      setFile(null);
      return;
    }

    const name = selectedFile.name.toLowerCase();
    if (
      !name.endsWith(".csv") &&
      !name.endsWith(".xlsx") &&
      !name.endsWith(".xls")
    ) {
      setError("Please upload a CSV or Excel (.xlsx/.xls) file");
      return;
    }
    setError("");
    setFile(selectedFile);
  };

  // helper to get filename from Content-Disposition header
  const getFilenameFromDisposition = (
    disposition: string | null,
    fallback: string
  ) => {
    if (!disposition) return fallback;
    const matchEnc = /filename\*=UTF-8''(.+)$/.exec(disposition);
    if (matchEnc && matchEnc[1]) {
      try {
        return decodeURIComponent(matchEnc[1]);
      } catch {
        return matchEnc[1];
      }
    }
    const match = /filename="?([^"]+)"?/.exec(disposition);
    return match?.[1] ?? fallback;
  };

  // download blob helper
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // generate CSV client-side and download
  const downloadCsvClient = (typeKey: BulkUploadDialogProps["type"]) => {
    const spec = TEMPLATES[typeKey];
    if (!spec) return;
    const headers = spec.headers;
    const example = spec.exampleRow.map((v) => {
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    });
    const rows = [headers.join(","), example.join(",")];
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `${typeKey}_template.csv`);
  };

  // download Excel template from the backend viewset action (download_template)
  const downloadExcelFromServer = async (
    typeKey: BulkUploadDialogProps["type"]
  ) => {
    resetMessages();
    try {
      const urlMap: Record<string, string> = {
        teachers: "http://127.0.0.1:8000/api/admin/teachers/download_template/",
        students: "http://127.0.0.1:8000/api/admin/students/download_template/",
        subjects: "http://127.0.0.1:8000/api/admin/subjects/download_template/",
        "subject-from-dept":
          "http://127.0.0.1:8000/api/admin/subject-from-dept/download_template/",
        "student-enrollments":
          "http://127.0.0.1:8000/api/admin/student-enrollments/download_template/",
      };
      const url = urlMap[typeKey];
      if (!url) {
        downloadCsvClient(typeKey);
        return;
      }

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv, */*",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        // fallback to client CSV template and show a small message
        setError(
          `Failed to download Excel template (${res.status}). Downloading CSV fallback.`
        );
        downloadCsvClient(typeKey);
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filename = getFilenameFromDisposition(
        disposition,
        `${typeKey}_template.xlsx`
      );
      downloadBlob(blob, filename);
    } catch (err) {
      // fallback client CSV on error
      console.error("downloadExcelFromServer error:", err);
      setError("Could not download Excel template — falling back to CSV.");
      downloadCsvClient(type);
    }
  };

  // Upload: allows CSV or Excel (xlsx/xls)
  const handleUpload = async () => {
    resetMessages();
    if (!file) {
      setError("Please select a CSV or Excel file to upload");
      return;
    }

    setLoading(true);

    try {
      let uploadFile: File = file;

      const filename = file.name.toLowerCase();
      const isExcel = filename.endsWith(".xlsx") || filename.endsWith(".xls");
      if (isExcel) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
        if (!sheet) {
          setError("Excel file has no sheets");
          return;
        }
        const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
        if (!csv.trim()) {
          setError("Excel file appears to be empty");
          return;
        }
        const baseName = file.name.replace(/\.(xlsx|xls)$/i, "");
        uploadFile = new File([csv], `${baseName}.csv`, {
          type: "text/csv;charset=utf-8;",
        });
      }

      const formData = new FormData();
      formData.append("file", uploadFile);

      // backend uses viewset action bulk_upload -> /api/admin/{type}/bulk_upload/
      const endpoint =
        process.env.NEXT_PUBLIC_BACKEND_URL + `/api/admin/${type}/bulk_upload/`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          // DO NOT set Content-Type — browser sets multipart boundary
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      // attempt to parse JSON; backend returns { message, errors } on success or { error } on failure
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (!res.ok) {
        // If backend sent structured errors, show them
        if (data && typeof data === "object") {
          if (data.errors && Array.isArray(data.errors) && data.errors.length) {
            setRowErrors(data.errors.map((e: any) => String(e)));
            setError("Some rows failed — see details below");
          } else if (data.detail || data.error) {
            setError(String(data.detail || data.error));
          } else {
            setError(JSON.stringify(data));
          }
        } else {
          setError(
            typeof data === "string" ? data : `Upload failed (${res.status})`
          );
        }
        return;
      }

      // success - show message and close after short delay unless there are returned row errors
      const createdMsg =
        (data && (data.message || data.created || data.created_count)) ??
        `Uploaded ${file.name}`;
      setSuccess(String(createdMsg));
      if (
        data &&
        data.errors &&
        Array.isArray(data.errors) &&
        data.errors.length
      ) {
        setRowErrors(data.errors.map((e: any) => String(e)));
        // keep dialog open so user can inspect rowErrors
      } else {
        // close quickly so user sees success then dialog closes
        setTimeout(() => {
          closeDialog();
        }, 900);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Bulk Upload {type.charAt(0).toUpperCase() + type.slice(1)}
          </h2>
          <button
            onClick={closeDialog}
            className="text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => downloadCsvClient(type)}>
              Download CSV Template
            </Button>
            <Button onClick={() => downloadExcelFromServer(type)}>
              Download Excel Template
            </Button>
          </div>

          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center transition">
            <input
              id="bulk-file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="bulk-file-input" className="cursor-pointer block">
              <p className="text-foreground font-medium">
                {file ? file.name : "Click to select CSV or Excel file"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV (.csv) or Excel (.xlsx/.xls) format accepted
              </p>
            </label>
          </div>

          {error && (
            <div className="flex gap-2 items-start p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {rowErrors.length > 0 && (
            <div className="p-3 rounded-md border border-muted text-sm bg-muted/5">
              <strong className="block mb-2">Row errors:</strong>
              <ul className="list-disc pl-5 space-y-1 max-h-40 overflow-auto">
                {rowErrors.map((r, i) => (
                  <li key={i} className="break-words">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {success && (
            <div className="flex gap-2 items-start p-3 bg-green-50 text-green-600 rounded-md text-sm">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={closeDialog} disabled={loading}>
              Close
            </Button>
            <Button onClick={handleUpload} disabled={!file || loading}>
              {loading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <strong>CSV/Excel Format:</strong> The file should have columns
            matching the entity fields. Use the template above.
          </p>
        </div>
      </Card>
    </div>
  );
}
