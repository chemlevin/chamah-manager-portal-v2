const PASSWORD_RECOVERY_REDIRECTS = Object.freeze({
  '__CHAMAH_MCP_ORIGIN__': '__CHAMAH_MCP_ORIGIN__',
  '__CHAMAH_PORTAL_ORIGIN__': '__CHAMAH_PORTAL_ORIGIN__'
});

export function getPasswordRecoveryRedirect(origin, redirects = PASSWORD_RECOVERY_REDIRECTS) {
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error('Password recovery is unavailable for this origin.');
  }
  const redirect = redirects[parsed.origin];
  if (!redirect || parsed.origin !== origin) {
    throw new Error('Password recovery is unavailable for this origin.');
  }
  return redirect;
}

