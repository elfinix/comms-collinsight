import { useState, useRef, ChangeEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { Card, CardHeader, CardBody, Button, Input, Select, PasswordInput, UserAvatar } from "../../components/ui";
import {
  User as UserIcon, Building2, Calendar, Moon, Sun, RefreshCw, UploadCloud,
  Trash2, CheckCircle, AlertCircle, ShieldCheck, Sliders, Lock, Sparkles, Layers, LayoutGrid, List
} from "lucide-react";
import { formatDate, Gender } from "../../services/dataService";
import { uploadUserMedia } from "../../services/storageService";

function formatMiddleInitial(middleName?: string): string {
  if (!middleName || !middleName.trim()) return "";
  const trimmed = middleName.trim();
  if (trimmed.endsWith(".")) return trimmed;
  const parts = trimmed.split(/\s+/);
  return parts.map((p) => `${p[0]?.toUpperCase() ?? ""}.`).join("");
}

export default function StudentProfile() {
  const { currentUser, updateCurrentUser } = useAuth();
  const {
    organizations, theme, setTheme, dataDensity, setDataDensity,
    tableDensity, setTableDensity, defaultView, setDefaultView,
    updateUser
  } = useApp();
  const { toast } = useToast();

  const org = currentUser?.organizationId ? organizations.find((o) => o.id === currentUser.organizationId) : null;
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const defaultYear = currentUser?.role === "student" ? (currentUser.yearLevel ?? "3rd Year") : (currentUser?.yearLevel ?? "Faculty/Staff");
  const [firstName, setFirstName] = useState(currentUser?.firstName ?? "");
  const [middleName, setMiddleName] = useState(currentUser?.middleName ?? "");
  const [lastName, setLastName] = useState(currentUser?.lastName ?? "");
  const [suffix, setSuffix] = useState(currentUser?.suffix ?? "");
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [gender, setGender] = useState<Gender>(currentUser?.gender ?? "male");
  const [yearLevel, setYearLevel] = useState(defaultYear);
  const [avatar, setAvatar] = useState<string | undefined>(currentUser?.avatar);

  // Feedback & Validations
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [currentPwdError, setCurrentPwdError] = useState("");
  const [newPwdError, setNewPwdError] = useState("");
  const [confirmPwdError, setConfirmPwdError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // System Preferences Feedback
  const [prefSuccess, setPrefSuccess] = useState(false);

  if (!currentUser) return null;

  // Handle Avatar Upload with Supabase media/ Bucket Persistence
  async function handleAvatarFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB.");
      return;
    }

    // 1. Instant local preview
    const localUrl = URL.createObjectURL(file);
    setAvatar(localUrl);

    // 2. Upload to Supabase media/ bucket
    const ext = file.name.split(".").pop() || "png";
    const fileName = `avatar_${Date.now()}.${ext}`;
    const uploadRes = await uploadUserMedia({
      organizationName: org?.name || "Administration",
      userId: currentUser.id,
      file,
      fileName,
    });

    const finalUrl = uploadRes.publicUrl || localUrl;
    setAvatar(finalUrl);
    updateCurrentUser({ avatar: finalUrl });
    updateUser(currentUser.id, { avatar: finalUrl });
    toast.success("Avatar Uploaded", "Your profile avatar has been uploaded successfully.");
  }

  function handleRemoveAvatar() {
    setAvatar(undefined);
    updateCurrentUser({ avatar: undefined });
    updateUser(currentUser!.id, { avatar: undefined });
    if (avatarInputRef.current) avatarInputRef.current.value = "";
    toast.info("Avatar Removed", "Profile photo reverted to avatar initials.");
  }

  // Handle Personal Info Save
  function handleSavePersonalInfo(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setNameError("");

    if (!firstName.trim() || !lastName.trim()) {
      setNameError("First Name and Last Name are required.");
      return;
    }

    // Email validation: must end in .edu.ph
    const eduPhRegex = /^[^\s@]+@[^\s@]+\.edu\.ph$/i;
    if (!eduPhRegex.test(email.trim())) {
      setEmailError("Institutional email must end with .edu.ph (e.g., student@lcup.edu.ph)");
      return;
    }

    const updates = {
      firstName: firstName.trim(),
      middleName: middleName.trim(),
      lastName: lastName.trim(),
      suffix: suffix.trim(),
      email: email.trim(),
      gender,
      yearLevel,
      avatar,
    };

    updateCurrentUser(updates);
    updateUser(currentUser!.id, updates);

    setSaveSuccess(true);
    toast.success("Profile Updated", "Personal information saved successfully.");
    setTimeout(() => setSaveSuccess(false), 3500);
  }

  // Handle Password Update
  function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setCurrentPwdError("");
    setNewPwdError("");
    setConfirmPwdError("");

    let hasError = false;

    if (!currentPassword) {
      setCurrentPwdError("Current password is required.");
      setPasswordError("Please enter your current password.");
      hasError = true;
    } else if (currentUser?.password && currentPassword !== currentUser.password) {
      setCurrentPwdError("Current password is incorrect.");
      setPasswordError("The current password you entered is incorrect.");
      hasError = true;
    }

    if (!newPassword) {
      setNewPwdError("New password is required.");
      if (!hasError) setPasswordError("Please enter a new password.");
      hasError = true;
    } else if (newPassword.length < 6) {
      setNewPwdError("Minimum 6 characters required.");
      if (!hasError) setPasswordError("New password must be at least 6 characters.");
      hasError = true;
    } else if (currentPassword && newPassword === currentPassword) {
      setNewPwdError("Cannot be same as current password.");
      if (!hasError) setPasswordError("New password cannot be the same as your current password.");
      hasError = true;
    }

    if (!confirmPassword) {
      setConfirmPwdError("Please confirm your password.");
      if (!hasError) setPasswordError("Please confirm your new password.");
      hasError = true;
    } else if (newPassword && newPassword !== confirmPassword) {
      setConfirmPwdError("Passwords do not match.");
      if (!hasError) setPasswordError("New password and confirmation do not match.");
      hasError = true;
    }

    if (hasError) return;

    updateCurrentUser({ password: newPassword });
    updateUser(currentUser!.id, { password: newPassword });

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setCurrentPwdError("");
    setNewPwdError("");
    setConfirmPwdError("");
    setPasswordSuccess(true);
    toast.success("Password Updated", "Your account password was successfully updated.");
    setTimeout(() => setPasswordSuccess(false), 3500);
  }

  // Persist User Preference to Database & Context
  function persistUserSetting(newPartialSettings: any) {
    if (!currentUser) return;
    const currentSettings = currentUser.settings || {};
    const updatedSettings = { ...currentSettings, ...newPartialSettings };
    updateCurrentUser({ settings: updatedSettings });
    updateUser(currentUser.id, { settings: updatedSettings });
  }

  // Handle Reset Preferences
  function handleResetPreferences() {
    setDataDensity(10);
    setDefaultView("grid");
    setTableDensity("comfortable");
    persistUserSetting({
      dataDensity: "comfortable",
      defaultView: "grid",
      tableDensity: "comfortable",
    });
    setPrefSuccess(true);
    toast.info("Preferences Reset", "Display and density defaults restored.");
    setTimeout(() => setPrefSuccess(false), 2500);
  }

  // Display Name with formatted middle initial
  const displayMiddle = formatMiddleInitial(currentUser.middleName);
  const displayFullName = `${currentUser.firstName} ${displayMiddle ? displayMiddle + " " : ""}${currentUser.lastName}${currentUser.suffix ? " " + currentUser.suffix : ""}`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Profile & Settings</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Manage your official institutional profile, security credentials, and application preferences.
        </p>
      </div>

      {/* ── PROFILE BANNER CARD ─────────────────────────────────────────────── */}
      <Card className="border-[var(--border)] overflow-hidden shadow-sm">
        <div className="h-20 relative overflow-hidden bg-gradient-to-r from-slate-950 via-[#0a4843] to-slate-900 border-b border-teal-800/40">
          {/* Abstract subtle mesh & dot grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:14px_14px] opacity-15" />

          {/* Ambient glowing orb */}
          <div className="absolute -top-10 right-1/4 w-40 h-40 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Minimalist vector arcs */}
          <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="banner-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#0f766e" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <circle cx="90%" cy="50%" r="60" stroke="url(#banner-grad)" strokeWidth="1" fill="none" />
            <circle cx="90%" cy="50%" r="90" stroke="url(#banner-grad)" strokeWidth="1" strokeDasharray="3 4" fill="none" />
            <path d="M -10,40 Q 200,-10 420,40 T 860,30" stroke="url(#banner-grad)" strokeWidth="1" fill="none" opacity="0.4" />
          </svg>
        </div>

        <CardBody className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 -mt-10 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              {/* Profile Avatar & Upload Controls */}
              <div className="relative group flex-shrink-0">
                <UserAvatar
                  gender={gender}
                  firstName={firstName || currentUser.firstName}
                  lastName={lastName || currentUser.lastName}
                  name={displayFullName}
                  avatar={avatar}
                  size="xl"
                  className="ring-4 ring-[var(--card)] shadow-md"
                />
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="pt-2 sm:pt-0">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)]">
                  {displayFullName}
                </h2>
                <p className="text-xs text-[var(--muted-foreground)] font-mono mt-0.5">{currentUser.email}</p>
              </div>
            </div>

            {/* Avatar action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => avatarInputRef.current?.click()}
                className="text-xs gap-1.5 font-medium"
              >
                <UploadCloud size={14} /> Upload Photo
              </Button>
              {avatar && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1"
                >
                  <Trash2 size={13} /> Revert
                </Button>
              )}
            </div>
          </div>

          {/* Badges / Meta row */}
          <div className="flex flex-wrap gap-2.5 pt-3 border-t border-[var(--border)] text-xs text-[var(--foreground)]">
            <div className="flex items-center gap-1.5 bg-[var(--muted)]/50 px-3 py-1.5 rounded-xl border border-[var(--border)]">
              <UserIcon size={14} className="text-[var(--primary)]" />
              <span className="font-medium">{currentUser.position}</span>
            </div>
            {org && (
              <div className="flex items-center gap-1.5 bg-[var(--muted)]/50 px-3 py-1.5 rounded-xl border border-[var(--border)]">
                <Building2 size={14} className="text-[var(--primary)]" />
                <span className="font-medium">{org.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-[var(--muted)]/50 px-3 py-1.5 rounded-xl border border-[var(--border)]">
              <Calendar size={14} className="text-[var(--primary)]" />
              <span className="text-[var(--muted-foreground)] font-normal">Member since {formatDate(currentUser.memberSince)}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── PERSONAL INFORMATION CARD ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="border-b border-[var(--border)] pb-3 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-[var(--foreground)]">Personal Information</h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Update your identification details, gender styling, and university credentials.
            </p>
          </div>
        </CardHeader>
        <CardBody className="p-6">
          <form onSubmit={handleSavePersonalInfo} className="space-y-4">
            <div
              className={`transition-all duration-500 ease-in-out overflow-hidden ${
                saveSuccess
                  ? "max-h-20 opacity-100 translate-y-0"
                  : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
              }`}
            >
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 shadow-2xs font-medium">
                <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
                <span>Personal information changes saved successfully!</span>
              </div>
            </div>
            {nameError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in shadow-2xs font-medium">
                <AlertCircle size={15} className="text-rose-600 flex-shrink-0" />
                <span>{nameError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label="Middle Name"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="e.g., Santos, Delos Reyes"
              />
              <Input
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <Input
                label="Suffix"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                placeholder="e.g., Jr., III"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="sm:col-span-1">
                <Input
                  label="Institutional Email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  error={emailError}
                  placeholder="name@lcup.edu.ph"
                  required
                />
              </div>

              <div className="sm:col-span-1">
                <Select
                  label="Gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "non-binary", label: "Non-binary" },
                  ]}
                />
              </div>

              <div className="sm:col-span-1">
                <Select
                  label="Year / Academic Level"
                  value={yearLevel}
                  onChange={(e) => setYearLevel(e.target.value)}
                  options={
                    currentUser.role === "student"
                      ? [
                          { value: "1st Year", label: "1st Year" },
                          { value: "2nd Year", label: "2nd Year" },
                          { value: "3rd Year", label: "3rd Year" },
                          { value: "4th Year", label: "4th Year" },
                          { value: "5th Year", label: "5th Year" },
                        ]
                      : [
                          { value: "Faculty/Staff", label: "Faculty/Staff" },
                          { value: "Not Applicable", label: "Not Applicable" },
                        ]
                  }
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--border)]">
              <Button type="submit" variant="primary" className="font-medium gap-1.5">
                <CheckCircle size={15} /> Save Changes
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* ── SECURITY CREDENTIALS CARD ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="border-b border-[var(--border)] pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center border border-teal-200">
              <Lock size={15} />
            </div>
            <div>
              <h2 className="font-bold text-base text-[var(--foreground)]">Security & Password</h2>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Ensure your account credentials are secure with regular password updates.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-6">
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div
              className={`-mt-3 transition-all duration-500 ease-in-out overflow-hidden ${
                passwordSuccess
                  ? "max-h-20 opacity-100 translate-y-0"
                  : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
              }`}
            >
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 shadow-2xs font-medium">
                <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
                <span>Password updated successfully!</span>
              </div>
            </div>
            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in shadow-2xs font-medium">
                <AlertCircle size={15} className="text-rose-600 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <PasswordInput
                label="Current Password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (currentPwdError) setCurrentPwdError("");
                  if (passwordError) setPasswordError("");
                }}
                error={currentPwdError}
                placeholder="Enter current password"
              />
              <PasswordInput
                label="New Password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (newPwdError) setNewPwdError("");
                  if (passwordError) setPasswordError("");
                }}
                error={newPwdError}
                placeholder="Min. 6 characters"
              />
              <PasswordInput
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPwdError) setConfirmPwdError("");
                  if (passwordError) setPasswordError("");
                }}
                error={confirmPwdError}
                placeholder="Re-enter new password"
              />
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[var(--border)] flex-wrap gap-3">
              <Button type="submit" variant="outline" className="font-medium gap-1.5">
                <ShieldCheck size={15} /> Update Password
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* ── SYSTEM PREFERENCES CARD ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="border-b border-[var(--border)] pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center border border-teal-200">
              <Sliders size={15} />
            </div>
            <div>
              <h2 className="font-bold text-base text-[var(--foreground)]">System Preferences</h2>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Customize data presentation density, table layouts, and interface behaviors.
              </p>
            </div>
          </div>
          <div
            className={`transition-all duration-500 ease-in-out transform ${
              prefSuccess
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
            }`}
          >
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs inline-flex items-center gap-1">
              ✓ Preferences Defaulted
            </span>
          </div>
        </CardHeader>

        <CardBody className="p-6 space-y-5">
          {/* 1. Data Density First (as Dropdown) */}
          <div className="p-4 rounded-xl bg-[var(--muted)]/20 border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                <Layers size={16} className="text-[var(--primary)]" /> Data Density
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Controls the standard number of records displayed across pagination tables.
              </p>
            </div>
            <div className="w-full sm:w-56 flex-shrink-0">
              <Select
                value={String(dataDensity)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDataDensity(val);
                  persistUserSetting({ dataDensity: val === 10 ? "comfortable" : "compact" });
                }}
                options={[
                  { value: "5", label: "5 rows per page" },
                  { value: "10", label: "10 rows (Default)" },
                  { value: "25", label: "25 rows per page" },
                  { value: "50", label: "50 rows per page" },
                ]}
              />
            </div>
          </div>

          {/* 2. Default View */}
          <div className="p-4 rounded-xl bg-[var(--muted)]/20 border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                <LayoutGrid size={16} className="text-[var(--primary)]" /> Default View
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Choose whether events and financial ledgers load in visual cards grid or itemized data table by default.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDefaultView("grid");
                  persistUserSetting({ defaultView: "grid" });
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition shadow-2xs cursor-pointer border flex items-center gap-1.5 ${
                  defaultView === "grid"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white font-bold"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60 hover:text-[var(--foreground)]"
                }`}
              >
                <LayoutGrid size={13} /> Grid View
              </button>
              <button
                type="button"
                onClick={() => {
                  setDefaultView("list");
                  persistUserSetting({ defaultView: "list" });
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition shadow-2xs cursor-pointer border flex items-center gap-1.5 ${
                  defaultView === "list"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white font-bold"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60 hover:text-[var(--foreground)]"
                }`}
              >
                <List size={13} /> List View
              </button>
            </div>
          </div>

          {/* 3. Table Density (Comfortable vs Compact) */}
          <div className="p-4 rounded-xl bg-[var(--muted)]/20 border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                <Sliders size={16} className="text-[var(--primary)]" /> Table Density
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Switch between comfortable spacious padding or high-efficiency compact table layouts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTableDensity("comfortable");
                  persistUserSetting({ tableDensity: "comfortable" });
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition shadow-2xs cursor-pointer border ${
                  tableDensity === "comfortable"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white font-bold"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60 hover:text-[var(--foreground)]"
                }`}
              >
                Comfortable (Standard)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTableDensity("compact");
                  persistUserSetting({ tableDensity: "compact" });
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition shadow-2xs cursor-pointer border ${
                  tableDensity === "compact"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white font-bold"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60 hover:text-[var(--foreground)]"
                }`}
              >
                Compact (High Density)
              </button>
            </div>
          </div>

          {/* 4. Theme at the Bottom Marked as Coming Soon */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sun size={16} className="text-amber-600" /> Color Theme
                </p>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dark theme and custom university palette accents are currently under development for v2.0.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs border border-teal-400 bg-teal-50 text-teal-800 font-bold shadow-2xs">
                <Sun size={14} className="text-amber-500" /> Light (Active)
              </div>
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs border border-slate-200 bg-slate-100 text-slate-400 font-medium cursor-not-allowed opacity-60">
                <Moon size={14} /> Dark Mode
              </div>
            </div>
          </div>

          {/* Reset Action */}
          <div className="flex justify-between items-center pt-3 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--muted-foreground)]">Preferences apply immediately to your active session.</span>
            <Button variant="outline" size="sm" onClick={handleResetPreferences} className="text-xs gap-1.5 font-medium">
              <RefreshCw size={13} /> Reset Preferences to Default
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
