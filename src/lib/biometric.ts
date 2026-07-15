// Device-bound biometric unlock (Touch ID / Face ID / Windows Hello) using
// WebAuthn platform authenticators. This gates the UI behind the device's
// biometric — proportionate to the shared PIN it complements (it is not a
// server-verified identity check). One passkey per device, stored locally.

const CRED_KEY = 'vo-biometric-cred-id'

const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export async function isBiometricSupported(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('PublicKeyCredential' in window)) return false
    // @ts-ignore — not in older TS lib.dom
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function hasBiometricRegistered(): boolean {
  try { return !!localStorage.getItem(CRED_KEY) } catch { return false }
}

export function clearBiometric() {
  try { localStorage.removeItem(CRED_KEY) } catch { /* ignore */ }
}

// Register a platform passkey on this device (must be called from a user
// gesture, over HTTPS). Returns true on success.
export async function registerBiometric(): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const userId = crypto.getRandomValues(new Uint8Array(16))
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'VO Hub' },
        user: { id: userId, name: 'vo-hub-device', displayName: 'VO Hub' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null
    if (!cred) return false
    localStorage.setItem(CRED_KEY, toB64(cred.rawId))
    return true
  } catch {
    return false
  }
}

// Prompt the device biometric to unlock. Returns true if verified.
export async function verifyBiometric(): Promise<boolean> {
  try {
    const id = localStorage.getItem(CRED_KEY)
    if (!id) return false
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: fromB64(id), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
      },
    })
    return !!assertion
  } catch {
    return false
  }
}
