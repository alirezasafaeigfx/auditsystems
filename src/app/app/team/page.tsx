"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCSRFHeaders } from "../../../lib/csrf-client";

type Member = {
  id: string;
  userId: string;
  role: string;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
};

type Invite = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
};

type TeamData = {
  members: Member[];
  invites: Invite[];
};

const MUTABLE_ROLE_OPTIONS = ["ADMIN", "VIEWER"] as const;

const TEAM_ERROR_MESSAGES: Record<string, string> = {
  ALREADY_MEMBER: "این کاربر قبلاً عضو تیم است.",
  INVITE_PENDING: "دعوت‌نامه فعال برای این ایمیل وجود دارد.",
  CANNOT_INVITE_SELF: "نمی‌توانید خودتان را دعوت کنید.",
  INVALID_EMAIL: "ایمیل نامعتبر است.",
  INVALID_ROLE: "نقش دعوت معتبر نیست.",
  INVITE_NOT_FOUND: "دعوت‌نامه پیدا نشد.",
  INVITE_NOT_ACTIVE: "دعوت‌نامه دیگر فعال نیست.",
  INVITE_ALREADY_ACCEPTED: "دعوت‌نامه قبلاً پذیرفته شده است.",
  DELIVERY_NOT_CONFIGURED: "سرویس ارسال دعوت‌نامه پیکربندی نشده است.",
  DELIVERY_FAILED: "ارسال دعوت‌نامه ناموفق بود و لینک ایجادشده غیرفعال شد.",
  RATE_LIMITED: "تعداد عملیات بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.",
  FORBIDDEN: "شما اجازه این عملیات را ندارید.",
};

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    OWNER: { bg: "#dbeafe", fg: "#1e40af" },
    ADMIN: { bg: "#d1fae5", fg: "#065f46" },
    VIEWER: { bg: "#f3f4f6", fg: "#374151" },
  };
  const c = colors[role] ?? colors.VIEWER;
  return (
    <span style={{ display: "inline-block", padding: "0.125rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 600, background: c.bg, color: c.fg }}>
      {role}
    </span>
  );
}

export default function TeamPage() {
  const router = useRouter();
  const [data, setData] = useState<TeamData>({ members: [], invites: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("VIEWER");
  const [inviting, setInviting] = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [inviteAction, setInviteAction] = useState<string | null>(null);

  async function loadTeam() {
    const response = await fetch("/api/team", { cache: "no-store" });
    if (response.status === 401) {
      router.push("/login");
      return;
    }
    const body = await response.json() as Partial<TeamData> & { error?: string };
    if (!response.ok || body.error) throw new Error(body.error ?? "TEAM_LOAD_FAILED");
    setData({ members: body.members ?? [], invites: body.invites ?? [] });
  }

  useEffect(() => {
    loadTeam()
      .catch(() => setError("خطا در بارگذاری اعضا"))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    try {
      const csrf = await fetchCSRFHeaders();
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrf },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok || body.error) {
        setError(TEAM_ERROR_MESSAGES[body.error ?? ""] ?? "خطا در ارسال دعوت‌نامه");
        return;
      }
      setInviteEmail("");
      setInviteRole("VIEWER");
      await loadTeam();
    } catch {
      setError("خطا در ارسال دعوت‌نامه");
    } finally {
      setInviting(false);
    }
  }

  async function handleInviteAction(inviteId: string, action: "RESEND" | "REVOKE") {
    if (action === "REVOKE" && !confirm("دعوت‌نامه غیرفعال شود؟")) return;
    setInviteAction(`${inviteId}:${action}`);
    setError(null);
    try {
      const csrf = await fetchCSRFHeaders();
      const response = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrf },
        body: JSON.stringify({ inviteId, action }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok || body.error) {
        setError(TEAM_ERROR_MESSAGES[body.error ?? ""] ?? "عملیات دعوت‌نامه ناموفق بود.");
        return;
      }
      await loadTeam();
    } catch {
      setError("عملیات دعوت‌نامه ناموفق بود.");
    } finally {
      setInviteAction(null);
    }
  }

  async function handleChangeRole(memberId: string, userId: string, newRole: string) {
    setChangingRole(memberId);
    setError(null);
    try {
      const csrf = await fetchCSRFHeaders();
      const response = await fetch("/api/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...csrf },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok || body.error) {
        setError(TEAM_ERROR_MESSAGES[body.error ?? ""] ?? "خطا در تغییر نقش");
        return;
      }
      setData((previous) => ({
        ...previous,
        members: previous.members.map((member) => member.userId === userId ? { ...member, role: newRole } : member),
      }));
    } catch {
      setError("خطا در تغییر نقش");
    } finally {
      setChangingRole(null);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("آیا از حذف این عضو اطمینان دارید؟")) return;
    setRemoving(userId);
    setError(null);
    try {
      const csrf = await fetchCSRFHeaders();
      const response = await fetch(`/api/team?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: csrf,
      });
      const body = await response.json() as { error?: string };
      if (!response.ok || body.error) {
        setError(TEAM_ERROR_MESSAGES[body.error ?? ""] ?? "خطا در حذف عضو");
        return;
      }
      setData((previous) => ({
        ...previous,
        members: previous.members.filter((member) => member.userId !== userId),
      }));
    } catch {
      setError("خطا در حذف عضو");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>مدیریت تیم</h1>

      {error && (
        <div role="alert" style={{ padding: "0.75rem 1rem", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "0.5rem", marginBottom: "1rem", color: "var(--danger)", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>دعوت عضو جدید</h2>
        <form onSubmit={handleInvite} style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="email"
            maxLength={254}
            placeholder="ایمیل عضو جدید"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            required
            style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.375rem", fontSize: "0.875rem", flex: "1 1 200px" }}
          />
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value)}
            style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.375rem", fontSize: "0.875rem" }}
          >
            <option value="VIEWER">مشاهده‌گر (VIEWER)</option>
            <option value="ADMIN">مدیر (ADMIN)</option>
          </select>
          <button type="submit" disabled={inviting} className="button" style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem", cursor: inviting ? "not-allowed" : "pointer" }}>
            {inviting ? "در حال ارسال..." : "ارسال دعوت‌نامه"}
          </button>
        </form>
      </div>

      {data.invites.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>دعوت‌نامه‌های در انتظار</h2>
          <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border, #e5e7eb)", background: "var(--surface, #f9fafb)" }}>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>ایمیل</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>نقش</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>انقضا</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {data.invites.map((invite) => (
                  <tr key={invite.id} style={{ borderBottom: "1px solid var(--border, #f3f4f6)" }}>
                    <td style={{ padding: "0.75rem" }}>{invite.email}</td>
                    <td style={{ padding: "0.75rem" }}><RoleBadge role={invite.role} /></td>
                    <td style={{ padding: "0.75rem", color: "var(--muted, #6b7280)" }}>{new Date(invite.expiresAt).toLocaleDateString("fa-IR")}</td>
                    <td style={{ padding: "0.75rem", display: "flex", gap: "0.5rem" }}>
                      <button
                        className="button secondary"
                        disabled={inviteAction !== null}
                        onClick={() => handleInviteAction(invite.id, "RESEND")}
                      >
                        {inviteAction === `${invite.id}:RESEND` ? "در حال ارسال..." : "ارسال مجدد"}
                      </button>
                      <button
                        className="button secondary"
                        disabled={inviteAction !== null}
                        onClick={() => handleInviteAction(invite.id, "REVOKE")}
                        style={{ color: "var(--danger, #dc2626)", borderColor: "var(--danger, #dc2626)" }}
                      >
                        {inviteAction === `${invite.id}:REVOKE` ? "در حال لغو..." : "لغو"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>اعضای تیم</h2>
        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted, #6b7280)" }}>در حال بارگذاری...</div>
        ) : data.members.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem", color: "var(--muted, #6b7280)" }}>
            هیچ عضوی یافت نشد
          </div>
        ) : (
          <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border, #e5e7eb)", background: "var(--surface, #f9fafb)" }}>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>نام</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>ایمیل</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>نقش</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>تاریخ عضویت</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((member) => (
                  <tr key={member.id} style={{ borderBottom: "1px solid var(--border, #f3f4f6)" }}>
                    <td style={{ padding: "0.75rem" }}>{member.user.name ?? "—"}</td>
                    <td style={{ padding: "0.75rem" }}>{member.user.email}</td>
                    <td style={{ padding: "0.75rem" }}>
                      {member.role === "OWNER" ? (
                        <RoleBadge role={member.role} />
                      ) : (
                        <select
                          value={member.role}
                          onChange={(event) => handleChangeRole(member.id, member.userId, event.target.value)}
                          disabled={changingRole === member.id}
                          style={{ padding: "0.25rem 0.5rem", border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.375rem", fontSize: "0.8125rem", cursor: changingRole === member.id ? "not-allowed" : "pointer" }}
                        >
                          {MUTABLE_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem", color: "var(--muted, #6b7280)" }}>{new Date(member.createdAt).toLocaleDateString("fa-IR")}</td>
                    <td style={{ padding: "0.75rem" }}>
                      {member.role !== "OWNER" && (
                        <button
                          onClick={() => handleRemove(member.userId)}
                          disabled={removing === member.userId}
                          className="button secondary"
                          style={{ padding: "0.25rem 0.75rem", fontSize: "0.8125rem", cursor: removing === member.userId ? "not-allowed" : "pointer", color: "var(--danger, #dc2626)", borderColor: "var(--danger, #dc2626)" }}
                        >
                          {removing === member.userId ? "در حال حذف..." : "حذف"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
