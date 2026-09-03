"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { withBasePath } from "@/lib/base-path";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(withBasePath("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = (await response.json()) as {
      error?: string;
      user?: { role: "student" | "admin" };
    };
    setLoading(false);
    if (!response.ok || !result.user) {
      setError(result.error ?? "登录失败。");
      return;
    }
    window.location.href = withBasePath(
      result.user.role === "admin" ? "/admin/accounts" : "/",
    );
  }
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-3">
          <Image
            src={withBasePath("/beio-mark.png")}
            alt="BEIO Lab"
            width={64}
            height={48}
            className="h-12 w-16 object-contain"
          />
          <span className="font-bold text-[#0b3768]">BEIO LAB · 周报</span>
        </Link>
        <section className="rounded-3xl border bg-card p-6 shadow-[0_20px_60px_rgb(11_55_104/10%)] sm:p-8">
          <h1 className="text-2xl font-bold text-[#0b2f58]">登录</h1>
          <p className="mb-6 mt-2 text-sm text-muted-foreground">
            学生与管理员使用同一入口，系统按账号角色进入对应工作台。
          </p>
          <form onSubmit={submit} className="space-y-4">
            <label
              htmlFor="login-email"
              className="block text-sm font-semibold"
            >
              邮箱
            </label>
            <Input
              id="login-email"
              name="email"
              required
              type="email"
              autoComplete="email"
            />
            <label
              htmlFor="login-password"
              className="block text-sm font-semibold"
            >
              密码
            </label>
            <Input
              id="login-password"
              name="password"
              required
              type="password"
              autoComplete="current-password"
            />
            <p className="text-right text-xs text-muted-foreground">
              忘记密码请联系管理员重置
            </p>
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-xl bg-[#0b3768]"
            >
              <LogIn />
              {loading ? "正在登录…" : "登录"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            还没有账号？{" "}
            <Link
              href="/register"
              className="font-semibold text-[#0b5b92] hover:underline"
            >
              现在注册
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
