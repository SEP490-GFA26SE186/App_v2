import { DEMO, db, plans } from "@/mocks/db";
import type { Subscription, User } from "@/types/models";
import { fail, respond, uid } from "./mockApi";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Khớp auth.validation.js của BE
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,50}$/;
export const MIN_REGISTER_PASSWORD = 8;
export const PIN_REGEX = /^\d{4,6}$/;

/** BE cho đăng nhập bằng email hoặc username */
export const isValidIdentity = (value: string) => EMAIL_REGEX.test(value) || USERNAME_REGEX.test(value);

const tokens = () => ({ accessToken: uid("access"), refreshToken: uid("refresh") });

/** POST /auth/login → { user, tokens } */
export const login = (emailOrUsername: string, password: string) =>
  respond(() => {
    const ok = [db.user.email, db.user.username, ...DEMO.identity].includes(emailOrUsername.trim().toLowerCase()) && password === db.password;
    if (!ok) fail("Email/Tên đăng nhập hoặc mật khẩu chưa đúng", 401);
    return { user: db.user, tokens: tokens() };
  }, 800);

/** POST /auth/register → { user, tokens }. Mock: tài khoản mới dùng chung dữ liệu demo cho dễ xem UI. */
export const register = (payload: { username: string; email: string; password: string; fullName?: string; phone?: string }) =>
  respond(() => {
    if (payload.email.toLowerCase().endsWith("@test.com")) fail("Email này đã được đăng ký, ba mẹ đăng nhập nhé", 409);
    db.user = { ...db.user, username: payload.username, email: payload.email, fullName: payload.fullName || null, phone: payload.phone || null, emailVerifiedAt: null };
    db.password = payload.password;
    return { user: db.user, tokens: tokens() };
  }, 900);

/** GET /auth/me → user (kèm hasKidPin, wallet) */
export const getMe = () => respond((): User => db.user);

/** GET /subscriptions/me */
export const getSubscription = () =>
  respond((): Subscription => ({
    isFallback: false,
    plan: plans.find((p) => p.id === db.planId)!,
    status: "active",
    periodEnd: db.planId === "plan-free" ? null : db.periodEnd,
    nextCreditGrantAt: db.periodEnd,
    usage: { childrenCount: db.children.length, charactersCount: db.characters.length },
  }));

// ---- Mật khẩu & email ----

export const requestPasswordReset = (_email: string) => respond(() => ({ message: "ok" }), 700);

export const resetPassword = ({ token, newPassword }: { token: string; newPassword: string }) =>
  respond(() => {
    if (token.trim().length < 6) fail("Mã khôi phục không đúng hoặc đã hết hạn");
    db.password = newPassword;
    return { message: "ok" };
  });

export const changePassword = ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
  respond(() => {
    if (currentPassword !== db.password) fail("Mật khẩu hiện tại chưa đúng");
    db.password = newPassword;
    return { message: "ok" };
  });

export const sendVerificationEmail = (_email: string) => respond(() => ({ message: "ok" }), 700);

export const verifyEmail = (token: string) =>
  respond(() => {
    if (token.trim().length < 6) fail("Mã xác thực không đúng hoặc đã được dùng");
    db.user = { ...db.user, emailVerifiedAt: new Date().toISOString() };
    return { emailVerifiedAt: db.user.emailVerifiedAt };
  });

// ---- Mã PIN thoát Kid Mode (users.kid_exit_pin_hash) — 4–6 chữ số ----

export const setKidPin = (pin: string) =>
  respond(() => {
    if (db.kidPin) fail("Tài khoản đã có mã PIN, ba mẹ dùng chức năng đổi PIN nhé");
    db.kidPin = pin;
    db.user = { ...db.user, hasKidPin: true };
    return { message: "ok" };
  });

export const changeKidPin = ({ newPin, currentPin, password }: { newPin: string; currentPin?: string; password?: string }) =>
  respond(() => {
    if (currentPin !== undefined && currentPin !== db.kidPin) fail("Mã PIN hiện tại chưa đúng");
    if (password !== undefined && password !== db.password) fail("Mật khẩu tài khoản chưa đúng");
    db.kidPin = newPin;
    return { message: "ok" };
  });
