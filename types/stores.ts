import { signInSchema } from "@/lib/validations/auth";
import { User as PrismaUser } from "@prisma/client";
import z from "zod";

export type LoginResponse = {
  success: boolean;
  message: string;
  user?: SafeUser;
  remember?: boolean;
  errors?: Record<string, string[] | undefined>;
};

export type Department = {
  id: string;
  name: string;
  code: string;
  members: number;
  createdAt: string;
  updatedAt: string;
  isFirstLogin?: boolean;
};

export type SafeUser = Omit<PrismaUser, "passwordHash">;
export type User = PrismaUser;

export type UserStore = {
  user: SafeUser | null;
  isLoading: boolean;
  error: string | null;
  isLoggingOut: boolean;
  hasFetchedUser: boolean;

  setUser: (user: SafeUser | null) => void;
  setLoading: (loading: boolean) => void;

  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  login: (values: SignInInput) => Promise<LoginResponse>;
};

export type SignInInput = z.infer<typeof signInSchema>;
