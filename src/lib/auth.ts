/**
 * Auth.js / NextAuth Architecture Placeholder
 * 
 * Touchline uses Auth.js for user identity and manager career persistence.
 * For local prototype and foundation phase, authentication is optional.
 * 
 * Intended Integration Strategy:
 * 1. Provider: Credentials / Email Magic Link / OAuth (GitHub/Google).
 * 2. Prisma Adapter: Connect `@auth/prisma-adapter` to link Users with Managers and Careers.
 * 3. Session Strategy: JWT session with user ID and active Manager ID attached to token.
 */

export interface UserSession {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  activeManagerId?: string;
}

export async function getSession(): Promise<UserSession | null> {
  // Placeholder session getter for local prototype
  if (process.env.NODE_ENV === 'development') {
    return {
      user: {
        id: 'dev-user-1',
        email: 'manager@touchline.local',
        name: 'Head Manager',
      },
      activeManagerId: 'dev-manager-1',
    };
  }
  return null;
}
