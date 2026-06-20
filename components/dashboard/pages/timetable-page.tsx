"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, Calendar, Check, AlertCircle } from "lucide-react";

interface TimetableTemplate {
  id: string;
  subject: string;
  subject_name: string;
  day_of_week: number;
  department: string;
  program: string;
  division: string;
  division_name: string;
  year: number;
  semester: number;
  default_teacher: string;
  default_teacher_name: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Division {
  id: number;
  name: string;
  year: number;
  department: number;
}

interface Teacher {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function TimetablePage({ token }: { token: string | null }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter / Options lists
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allDivisions, setAllDivisions] = useState<Division[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Selected Specification Filters
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("B.E. CSE");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSem, setSelectedSem] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");

  useEffect(() => {
    if (!selectedDept) return;
    const currentDept = departments.find((d) => String(d.id) === selectedDept);
    if (currentDept) {
      const deptName = currentDept.name.toLowerCase();
      if (deptName.includes("mca") || deptName.includes("master in computer applications")) {
        setSelectedProgram("MCA");
      } else if (deptName.includes("computer") || deptName.includes("cse")) {
        setSelectedProgram("B.E. CSE");
      } else if (deptName.includes("electronics") || deptName.includes("extc")) {
        setSelectedProgram("B.E. EXTC");
      } else if (deptName.includes("mechanical")) {
        setSelectedProgram("B.E. Mech");
      } else if (deptName.includes("civil")) {
        setSelectedProgram("B.E. Civil");
      } else if (deptName.includes("information technology") || deptName.includes("it")) {
        setSelectedProgram("B.E. IT");
      } else {
        setSelectedProgram(currentDept.name);
      }
    }
  }, [selectedDept, departments]);

  // Subjects & existing timetable for the selected specification
  const [specSubjects, setSpecSubjects] = useState<Subject[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<Record<number, Array<{ subject: string; default_teacher: string }>>>({
    0: [], 1: [], 2: [], 3: [], 4: [], 5: []
  });

  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [subjectTeachers, setSubjectTeachers] = useState<Record<string, Teacher[]>>({});
  const [loadingSubjectTeachers, setLoadingSubjectTeachers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!token) return;
    fetchOptions();
  }, [token]);

  // Fetch subjects and templates when spec changes
  useEffect(() => {
    if (selectedDept && selectedYear && selectedSem) {
      const absoluteSem = (Number(selectedYear) - 1) * 2 + Number(selectedSem);
      fetchSubjectsForSpec(selectedDept, selectedYear, String(absoluteSem));
    } else {
      setSpecSubjects([]);
    }
  }, [selectedDept, selectedYear, selectedSem]);

  useEffect(() => {
    if (selectedDivision && selectedDept && selectedYear && selectedSem) {
      const absoluteSem = (Number(selectedYear) - 1) * 2 + Number(selectedSem);
      fetchTimetableForSpec(selectedDivision, selectedDept, selectedYear, String(absoluteSem));
    } else {
      resetGrid();
    }
  }, [selectedDivision, selectedDept, selectedYear, selectedSem]);

  const resetGrid = () => {
    setTimetableSlots({
      0: [], 1: [], 2: [], 3: [], 4: [], 5: []
    });
  };

  const fetchTeachersForSubject = async (subjectId: string) => {
    if (!subjectId || subjectTeachers[subjectId] || loadingSubjectTeachers[subjectId] || !token) return;

    setLoadingSubjectTeachers((prev) => ({ ...prev, [subjectId]: true }));
    try {
      const divisionParam = selectedDivision ? `&division=${selectedDivision}` : "";
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/teacher-subjects/?subject=${subjectId}${divisionParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        const results = data.results || data;
        const list = results.map((item: any) => ({
          id: item.teacher_id,
          name: item.teacher_name,
        }));
        // Deduplicate
        const unique = list.filter(
          (t: any, idx: number, self: any[]) => self.findIndex((s) => s.id === t.id) === idx
        );
        setSubjectTeachers((prev) => ({ ...prev, [subjectId]: unique }));
      }
    } catch (err) {
      console.error("Error fetching teachers for subject:", err);
    } finally {
      setLoadingSubjectTeachers((prev) => ({ ...prev, [subjectId]: false }));
    }
  };

  useEffect(() => {
    setSubjectTeachers({});
  }, [selectedDivision]);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const deptRes = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/getDepartments/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (deptRes.ok) setDepartments(await deptRes.json());

      const divRes = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/divisions/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (divRes.ok) {
        const d = await divRes.json();
        setAllDivisions(d.results || d);
      }

      const tRes = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/teachers/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tRes.ok) {
        const d = await tRes.json();
        setTeachers(d.results || d);
      }
    } catch (err) {
      console.error("Failed to load select options:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectsForSpec = async (dept: string, year: string, sem: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/subject-from-dept/?department=${dept}&year=${year}&semester=${sem}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const results = data.results || data;
        const list: Subject[] = [];
        results.forEach((item: any) => {
          if (item.subject_details) {
            list.push(...item.subject_details);
          }
        });
        // Deduplicate
        const unique = list.filter((sub, idx, self) => self.findIndex(s => s.id === sub.id) === idx);
        setSpecSubjects(unique);
      }
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
    }
  };

  const fetchTimetableForSpec = async (division: string, dept: string, year: string, sem: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/timetable-templates/?division=${division}&year=${year}&semester=${sem}&department=${dept}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const templates: TimetableTemplate[] = data.results || data;
        const grouped: Record<number, Array<{ subject: string; default_teacher: string }>> = {
          0: [], 1: [], 2: [], 3: [], 4: [], 5: []
        };
        templates.forEach((t) => {
          const day = t.day_of_week;
          if (day >= 0 && day <= 5) {
            grouped[day].push({
              subject: String(t.subject),
              default_teacher: String(t.default_teacher),
            });
          }
        });
        setTimetableSlots(grouped);

        // Pre-fetch teachers for all subjects loaded in the timetable templates
        const subjectIds = Array.from(new Set(templates.map((t) => String(t.subject))));
        subjectIds.forEach((subId) => {
          if (subId) fetchTeachersForSubject(subId);
        });
      }
    } catch (err) {
      console.error("Failed to fetch timetable:", err);
    }
  };

  const filteredDivisions = allDivisions.filter(
    (div) => String(div.department) === selectedDept && div.year === Number(selectedYear)
  );

  const addSlot = (day: number) => {
    setTimetableSlots((prev) => ({
      ...prev,
      [day]: [...prev[day], { subject: "", default_teacher: "" }],
    }));
  };

  const removeSlot = (day: number, index: number) => {
    setTimetableSlots((prev) => {
      const updated = [...prev[day]];
      updated.splice(index, 1);
      return { ...prev, [day]: updated };
    });
  };

  const updateSlot = (day: number, index: number, field: "subject" | "default_teacher", value: string) => {
    setTimetableSlots((prev) => {
      const updated = [...prev[day]];
      if (field === "subject") {
        updated[index] = { ...updated[index], [field]: value, default_teacher: "" };
        if (value) {
          fetchTeachersForSubject(value);
        }
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, [day]: updated };
    });
  };

  const handleSave = async () => {
    setFormError("");
    setSuccessMsg("");

    if (!selectedDept || !selectedDivision || !selectedYear || !selectedSem) {
      setFormError("Please select all specification details first.");
      return;
    }

    // Prepare slots list
    const slotsPayload: Array<{ day_of_week: number; subject: number; default_teacher: number }> = [];
    let valid = true;

    Object.entries(timetableSlots).forEach(([dayStr, slots]) => {
      const day = Number(dayStr);
      slots.forEach((slot, idx) => {
        if (!slot.subject || !slot.default_teacher) {
          valid = false;
        }
        slotsPayload.push({
          day_of_week: day,
          subject: Number(slot.subject),
          default_teacher: Number(slot.default_teacher),
        });
      });
    });

    if (!valid) {
      setFormError("All added slots must have a subject and teacher selected.");
      return;
    }

    setSaving(true);
    try {
      const absoluteSem = (Number(selectedYear) - 1) * 2 + Number(selectedSem);
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/timetable-templates/bulk-save/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            department: Number(selectedDept),
            program: selectedProgram,
            year: Number(selectedYear),
            division: Number(selectedDivision),
            semester: absoluteSem,
            slots: slotsPayload,
          }),
        }
      );

      if (response.ok) {
        setSuccessMsg("Timetable saved successfully!");
        fetchTimetableForSpec(selectedDivision, selectedDept, selectedYear, selectedSem);
      } else {
        const data = await response.json();
        setFormError(data.error || JSON.stringify(data));
      }
    } catch (err) {
      setFormError("Network error while saving timetable templates.");
    } finally {
      setSaving(false);
    }
  };

  const isSpecFilled = selectedDept && selectedYear && selectedSem && selectedDivision;

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="w-8 h-8 text-primary" />
            Timetable Template Revamp
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure weekly recurring class schedules by Department and Division
          </p>
        </div>
      </div>

      {/* Selectors Card */}
      <Card className="p-6 shadow-md border-border bg-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Select Specification</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Department</label>
            <select
              className="w-full p-2 border rounded-md bg-background text-foreground"
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedYear("");
                setSelectedSem("");
                setSelectedDivision("");
              }}
            >
              <option value="">— Select Department —</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Year</label>
            <select
              className="w-full p-2 border rounded-md bg-background text-foreground"
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setSelectedSem("");
                setSelectedDivision("");
              }}
              disabled={!selectedDept}
            >
              <option value="">— Select Year —</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Semester</label>
            <select
              className="w-full p-2 border rounded-md bg-background text-foreground"
              value={selectedSem}
              onChange={(e) => {
                setSelectedSem(e.target.value);
                setSelectedDivision("");
              }}
              disabled={!selectedYear}
            >
              <option value="">— Select Semester —</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Division</label>
            <select
              className="w-full p-2 border rounded-md bg-background text-foreground"
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              disabled={!selectedSem}
            >
              <option value="">— Select Division —</option>
              {filteredDivisions.map((div) => (
                <option key={div.id} value={div.id}>
                  {div.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Timetable Grid */}
      {isSpecFilled ? (
        <div className="space-y-6">
          {specSubjects.length === 0 ? (
            <Card className="p-8 text-center bg-muted/30 border-dashed">
              <AlertCircle className="w-12 h-12 text-warning mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground">No subjects found</h3>
              <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                No subjects are mapped to this department, year, and semester. Please map subjects using the "Subject from Dept" menu first.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {DAYS.map((dayName, dayIndex) => {
                const slots = timetableSlots[dayIndex] || [];
                return (
                  <Card key={dayName} className="p-5 flex flex-col justify-between shadow-sm border bg-card">
                    <div>
                      <div className="flex items-center justify-between border-b pb-3 mb-4">
                        <h3 className="font-bold text-lg text-foreground">{dayName}</h3>
                        <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">
                          {slots.length} {slots.length === 1 ? "Class" : "Classes"}
                        </span>
                      </div>

                      {slots.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-md bg-muted/10">
                          No classes scheduled for {dayName}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {slots.map((slot, index) => (
                            <div key={index} className="flex gap-2 items-center bg-muted/20 p-2.5 rounded-md border border-border">
                              <div className="flex-1 space-y-1.5 min-w-0">
                                <select
                                  className="w-full text-xs p-1.5 border rounded bg-background text-foreground"
                                  value={slot.subject}
                                  onChange={(e) => updateSlot(dayIndex, index, "subject", e.target.value)}
                                >
                                  <option value="">— Select Subject —</option>
                                  {specSubjects.map((sub) => (
                                    <option key={sub.id} value={sub.id}>
                                      {sub.name} ({sub.code})
                                    </option>
                                  ))}
                                </select>
                                <select
                                  className="w-full text-xs p-1.5 border rounded bg-background text-foreground"
                                  value={slot.default_teacher}
                                  onChange={(e) => updateSlot(dayIndex, index, "default_teacher", e.target.value)}
                                >
                                  <option value="">— Select Teacher —</option>
                                  {(() => {
                                    const available = subjectTeachers[slot.subject] || [];
                                    const isLoading = loadingSubjectTeachers[slot.subject];
                                    if (isLoading) {
                                      return <option disabled>Loading teachers...</option>;
                                    }
                                    if (!slot.subject) {
                                      return <option disabled>Select subject first</option>;
                                    }
                                    if (available.length === 0) {
                                      const currentTeacherName = teachers.find(t => String(t.id) === slot.default_teacher)?.name || "Unknown Teacher";
                                      return (
                                        <>
                                          <option disabled>No teachers mapped to this subject</option>
                                          {slot.default_teacher && (
                                            <option value={slot.default_teacher}>{currentTeacherName}</option>
                                          )}
                                        </>
                                      );
                                    }
                                    const hasCurrent = available.some(t => String(t.id) === slot.default_teacher);
                                    const currentTeacherName = !hasCurrent && slot.default_teacher 
                                      ? (teachers.find(t => String(t.id) === slot.default_teacher)?.name || "Current Teacher")
                                      : null;
                                    return (
                                      <>
                                        {available.map((t) => (
                                          <option key={t.id} value={t.id}>
                                            {t.name}
                                          </option>
                                        ))}
                                        {currentTeacherName && slot.default_teacher && (
                                          <option value={slot.default_teacher}>{currentTeacherName} (Unmapped)</option>
                                        )}
                                      </>
                                    );
                                  })()}
                                </select>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSlot(dayIndex, index)}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addSlot(dayIndex)}
                      className="mt-4 w-full flex items-center justify-center gap-1 border-dashed hover:border-solid"
                    >
                      <Plus className="w-4 h-4" /> Add Class
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm">
            <div>
              {formError && (
                <p className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {formError}
                </p>
              )}
              {successMsg && (
                <p className="text-sm font-semibold text-success flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  {successMsg}
                </p>
              )}
              {!formError && !successMsg && (
                <p className="text-xs text-muted-foreground">
                  Verify slots for all days before saving the weekly schedule
                </p>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || specSubjects.length === 0}
              className="flex items-center gap-2 px-6"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving Timetable..." : "Save Timetable"}
            </Button>
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center bg-muted/20 border-dashed">
          <AlertCircle className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">Select Specification</h3>
          <p className="text-muted-foreground mt-1 max-w-md mx-auto">
            Please choose a department, year, semester, and division to load and manage the weekly timetable.
          </p>
        </Card>
      )}
    </div>
  );
}
