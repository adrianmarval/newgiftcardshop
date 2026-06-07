'use server';

import { z } from 'zod';
import { authApi } from '@/lib/auth';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { appSectionMap, roleMap } from '@/types/';

const registerInputSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain a special character'),
    confirmPassword: z.string(),
    portal: z.enum(['sell', 'buy', 'admin']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const registerOutputSchema = z.union([z.object({ success: z.literal(true), redirectTo: z.string() }), z.object({ error: z.string() })]);

export const register = actionClient
  .inputSchema(registerInputSchema)
  .outputSchema(registerOutputSchema)
  .action(async function ({ parsedInput: { fullName, email, password, portal } }) {
    const callbackURL = `${appSectionMap[portal]}/auth/login`;
    const role = roleMap[portal];
    console.log({ callbackURL });

    try {
      await authApi.signUpEmail({
        body: {
          name: fullName,
          email,
          password,
          role,
          callbackURL,
        },
        headers: await headers(),
      });
      return { success: true, redirectTo: callbackURL };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        error: 'An error occurred during registration. The email may already be in use.',
      };
    }
  });
