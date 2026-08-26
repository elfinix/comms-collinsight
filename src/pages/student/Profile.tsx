import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { Card, CardHeader, CardBody, Button, Input, PasswordInput } from "../../components/ui";
import { UserAvatar } from "../../components/ui";
import { User, Building2, Calendar, Moon, Sun, LayoutList, RefreshCw } from "lucide-react";
import { getOrgById, formatDate } from "../../services/mockData";

export default function StudentProfile() {
  const { currentUser } = useAuth();
  const { organizations, theme, setTheme, dataDensity, setDataDensity } = useApp();
  const org = currentUser?.organizationId ? getOrgById(currentUser.organizationId) : null;
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!currentUser) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Profile & Settings</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Manage your account information and preferences.</p>
      </div>

      {/* Profile Header */}
      <Card className="mb-6">
        <CardBody className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <UserAvatar gender={currentUser.gender} name={`${currentUser.firstName} ${currentUser.lastName}`} size="lg" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              {currentUser.firstName} {currentUser.middleName} {currentUser.lastName} {currentUser.suffix}
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] font-mono mt-0.5">{currentUser.email}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="flex items-center gap-2 bg-[var(--muted)] px-3 py-1.5 rounded-lg text-sm">
                <User size={14} className="text-[var(--primary)]" />
                <span>{currentUser.position}</span>
              </div>
              {org && (
                <div className="flex items-center gap-2 bg-[var(--muted)] px-3 py-1.5 rounded-lg text-sm">
                  <Building2 size={14} className="text-[var(--primary)]" />
                  <span>{org.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-[var(--muted)] px-3 py-1.5 rounded-lg text-sm">
                <Calendar size={14} className="text-[var(--primary)]" />
                <span>Member since {formatDate(currentUser.memberSince)}</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Personal Info */}
      <Card className="mb-6">
        <CardHeader><h2 className="font-semibold">Personal Information</h2></CardHeader>
        <CardBody>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="First Name" defaultValue={currentUser.firstName} />
            <Input label="Middle Name" defaultValue={currentUser.middleName} />
            <Input label="Last Name" defaultValue={currentUser.lastName} />
            <Input label="Suffix" defaultValue={currentUser.suffix} placeholder="e.g., Jr., III" />
            <Input label="Email" type="email" defaultValue={currentUser.email} />
            {currentUser.yearLevel && <Input label="Year/Level" defaultValue={currentUser.yearLevel} />}
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={handleSave}>{saved ? "✓ Saved" : "Save Changes"}</Button>
          </div>
        </CardBody>
      </Card>

      {/* Security */}
      <Card className="mb-6">
        <CardHeader><h2 className="font-semibold">Security</h2></CardHeader>
        <CardBody>
          <div className="flex flex-col gap-4 max-w-sm">
            <PasswordInput label="Current Password" placeholder="Enter current password" />
            <PasswordInput label="New Password" placeholder="Enter new password" />
            <PasswordInput label="Confirm New Password" placeholder="Confirm new password" />
            <Button variant="outline">Update Password</Button>
            <p className="text-xs text-[var(--muted-foreground)]">
              Forgot your password? Contact your System Administrator.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* System Preferences */}
      <Card>
        <CardHeader><h2 className="font-semibold">System Preferences</h2></CardHeader>
        <CardBody>
          <div className="flex flex-col gap-5">
            {/* Theme */}
            <div>
              <p className="text-sm font-medium text-[var(--foreground)] mb-2">Theme</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition ${theme === "light" ? "border-[var(--primary)] bg-[var(--secondary)] text-[var(--secondary-foreground)]" : "border-[var(--border)] text-[var(--muted-foreground)]"}`}
                >
                  <Sun size={15} /> Light
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition ${theme === "dark" ? "border-[var(--primary)] bg-[var(--secondary)] text-[var(--secondary-foreground)]" : "border-[var(--border)] text-[var(--muted-foreground)]"}`}
                >
                  <Moon size={15} /> Dark
                </button>
              </div>
            </div>

            {/* Data Density */}
            <div>
              <p className="text-sm font-medium text-[var(--foreground)] mb-2">Data Density (rows per page)</p>
              <div className="flex gap-3">
                {[5, 10, 25, 50].map((n) => (
                  <button
                    key={n}
                    onClick={() => setDataDensity(n)}
                    className={`px-4 py-2 rounded-lg text-sm border font-mono transition ${dataDensity === n ? "border-[var(--primary)] bg-[var(--secondary)] text-[var(--secondary-foreground)]" : "border-[var(--border)] text-[var(--muted-foreground)]"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset */}
            <Button variant="outline" size="sm" className="w-fit" onClick={() => { setTheme("light"); setDataDensity(10); }}>
              <RefreshCw size={14} /> Reset to Default
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
