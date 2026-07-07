"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type BrandSettings = {
  name: string;
  brandName: string | null;
  brandLogoBase64: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
};

function ReportPreview({
  brandName,
  logo,
  primaryColor,
  secondaryColor
}: {
  brandName: string | null;
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: "0.5rem",
        padding: "1.5rem",
        background: "white"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1rem",
          paddingBottom: "1rem",
          borderBottom: `2px solid ${primaryColor || "#059669"}`
        }}
      >
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt="Logo"
            style={{ height: "48px", width: "auto", objectFit: "contain" }}
          />
        )}
        <div>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: primaryColor || "#059669"
            }}
          >
            {brandName || "نام برند"}
          </div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            گزارش بررسی فنی و امنیتی
          </div>
        </div>
      </div>

      <div style={{ fontSize: "0.875rem", color: "#374151" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <strong>آدرس سایت:</strong> https://example.com
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <strong>تاریخ بررسی:</strong>{" "}
          {new Date().toLocaleDateString("fa-IR")}
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <strong>امتیاز کلی:</strong> 72/100
        </div>
      </div>

      <div
        style={{
          marginTop: "1rem",
          padding: "0.75rem",
          background: "#f0fdf4",
          borderRadius: "0.375rem",
          borderLeft: `4px solid ${primaryColor || "#059669"}`
        }}
      >
        <div
          style={{
            fontSize: "0.75rem",
            color: secondaryColor || "#047857",
            fontWeight: 600
          }}
        >
          یافته‌ها و پیشنهادات
        </div>
      </div>
    </div>
  );
}

export default function BrandSettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<BrandSettings>({
    name: "",
    brandName: null,
    brandLogoBase64: null,
    primaryColor: "#059669",
    secondaryColor: "#047857"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/brand");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setSettings({
          name: data.name,
          brandName: data.brandName,
          brandLogoBase64: data.brandLogoBase64,
          primaryColor: data.primaryColor || "#059669",
          secondaryColor: data.secondaryColor || "#047857"
        });
      } catch {
        setError("خطا در بارگذاری تنظیمات");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 512 * 1024) {
      setError("حجم لوگو باید کمتر از 512 کیلوبایت باشد");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSettings((prev) => ({
        ...prev,
        brandLogoBase64: event.target?.result as string
      }));
      setSuccess(false);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/settings/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: settings.brandName,
          brandLogoBase64: settings.brandLogoBase64,
          primaryColor: settings.primaryColor,
          secondaryColor: settings.secondaryColor
        })
      });

      if (!res.ok) {
        throw new Error("خطا در ذخیره‌سازی");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("خطا در ذخیره‌سازی تنظیمات");
    } finally {
      setSaving(false);
    }
  }

  function handleRemoveLogo() {
    setSettings((prev) => ({ ...prev, brandLogoBase64: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
        در حال بارگذاری...
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        تنظیمات برند و گزارش‌ها
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem",
          alignItems: "start"
        }}
      >
        <div>
          <div className="card" style={{ padding: "1.5rem" }}>
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                marginBottom: "1rem"
              }}
            >
              اطلاعات برند
            </h2>

            {error && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: "#fee2e2",
                  border: "1px solid #fca5a5",
                  borderRadius: "0.5rem",
                  marginBottom: "1rem",
                  color: "#991b1b",
                  fontSize: "0.875rem"
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: "#d1fae5",
                  border: "1px solid #6ee7b7",
                  borderRadius: "0.5rem",
                  marginBottom: "1rem",
                  color: "#065f46",
                  fontSize: "0.875rem"
                }}
              >
                تنظیمات با موفقیت ذخیره شد
              </div>
            )}

            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  marginBottom: "0.5rem"
                }}
              >
                نام برند در گزارش‌ها
              </label>
              <input
                type="text"
                value={settings.brandName || ""}
                onChange={(e) => {
                  setSettings((prev) => ({
                    ...prev,
                    brandName: e.target.value || null
                  }));
                  setSuccess(false);
                }}
                placeholder={settings.name}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  border: "1px solid var(--border, #d1d5db)",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem"
                }}
              />
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  marginTop: "0.25rem"
                }}
              >
                اگر خالی باشد، نام سازمان استفاده می‌شود
              </div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  marginBottom: "0.5rem"
                }}
              >
                لوگوی سازمان
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  style={{ fontSize: "0.875rem" }}
                />
                {settings.brandLogoBase64 && (
                  <button
                    onClick={handleRemoveLogo}
                    type="button"
                    style={{
                      padding: "0.375rem 0.75rem",
                      fontSize: "0.75rem",
                      color: "#dc2626",
                      border: "1px solid #fca5a5",
                      borderRadius: "0.375rem",
                      background: "white",
                      cursor: "pointer"
                    }}
                  >
                    حذف
                  </button>
                )}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  marginTop: "0.25rem"
                }}
              >
                حداکثر 512 کیلوبایت، فرمت‌های PNG یا SVG
              </div>
              {settings.brandLogoBase64 && (
                <div style={{ marginTop: "0.75rem" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.brandLogoBase64}
                    alt="پیش‌نمایش لوگو"
                    style={{
                      maxHeight: "64px",
                      width: "auto",
                      objectFit: "contain"
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  marginBottom: "0.5rem"
                }}
              >
                رنگ اصلی
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="color"
                  value={settings.primaryColor || "#059669"}
                  onChange={(e) => {
                    setSettings((prev) => ({
                      ...prev,
                      primaryColor: e.target.value
                    }));
                    setSuccess(false);
                  }}
                  style={{
                    width: "48px",
                    height: "36px",
                    padding: "2px",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    cursor: "pointer"
                  }}
                />
                <input
                  type="text"
                  value={settings.primaryColor || "#059669"}
                  onChange={(e) => {
                    setSettings((prev) => ({
                      ...prev,
                      primaryColor: e.target.value
                    }));
                    setSuccess(false);
                  }}
                  style={{
                    width: "120px",
                    padding: "0.375rem 0.5rem",
                    border: "1px solid var(--border, #d1d5db)",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontFamily: "monospace"
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  marginBottom: "0.5rem"
                }}
              >
                رنگ ثانویه
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="color"
                  value={settings.secondaryColor || "#047857"}
                  onChange={(e) => {
                    setSettings((prev) => ({
                      ...prev,
                      secondaryColor: e.target.value
                    }));
                    setSuccess(false);
                  }}
                  style={{
                    width: "48px",
                    height: "36px",
                    padding: "2px",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    cursor: "pointer"
                  }}
                />
                <input
                  type="text"
                  value={settings.secondaryColor || "#047857"}
                  onChange={(e) => {
                    setSettings((prev) => ({
                      ...prev,
                      secondaryColor: e.target.value
                    }));
                    setSuccess(false);
                  }}
                  style={{
                    width: "120px",
                    padding: "0.375rem 0.5rem",
                    border: "1px solid var(--border, #d1d5db)",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontFamily: "monospace"
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="button primary"
              style={{
                padding: "0.625rem 1.5rem",
                width: "100%",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
            </button>
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: "1.5rem" }}>
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                marginBottom: "1rem"
              }}
            >
              پیش‌نمایش گزارش
            </h2>
            <ReportPreview
              brandName={settings.brandName}
              logo={settings.brandLogoBase64}
              primaryColor={settings.primaryColor}
              secondaryColor={settings.secondaryColor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
