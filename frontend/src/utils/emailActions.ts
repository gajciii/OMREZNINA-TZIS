import type { ActionCodeSettings } from 'firebase/auth';
import { auth, authEmulatorUrl, useFirebaseEmulators } from 'src/firebase-config';

export function emailActionSettings(path: string): ActionCodeSettings {
  const basePath = import.meta.env.BASE_URL;
  return {
    url: new URL(`${basePath}${path.replace(/^\//, '')}`, window.location.origin).href,
    handleCodeInApp: false,
  };
}

type EmailActionType = 'VERIFY_EMAIL' | 'PASSWORD_RESET';
type LocalEmailCode = { email: string; requestType: EmailActionType; oobCode: string };

// The local Auth emulator stores email actions instead of delivering real email.
export async function getLocalEmailActionLink(email: string, requestType: EmailActionType): Promise<string | null> {
  if (!useFirebaseEmulators) return null;

  try {
    const projectId = auth.app.options.projectId;
    const response = await fetch(`${authEmulatorUrl}/emulator/v1/projects/${projectId}/oobCodes`);
    if (!response.ok) return null;
    const { oobCodes = [] }: { oobCodes?: LocalEmailCode[] } = await response.json();
    const code = [...oobCodes].reverse().find(
      (item) => item.email.toLowerCase() === email.toLowerCase() && item.requestType === requestType,
    );
    if (!code) return null;

    const link = new URL(`${import.meta.env.BASE_URL}auth/action`, window.location.origin);
    link.searchParams.set('mode', requestType === 'VERIFY_EMAIL' ? 'verifyEmail' : 'resetPassword');
    link.searchParams.set('oobCode', code.oobCode);
    return link.href;
  } catch {
    // Links remain available in the emulator terminal if its REST API is unavailable.
    return null;
  }
}
