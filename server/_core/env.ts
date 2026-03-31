export const ENV = {
  appId: (process.env.VITE_APP_ID ?? "").trim(),
  cookieSecret: (process.env.JWT_SECRET ?? "").trim(),
  databaseUrl: (process.env.DATABASE_URL ?? "").trim(),
  oAuthServerUrl: (process.env.OAUTH_SERVER_URL ?? "").trim(),
  oAuthClientSecret: (process.env.OAUTH_CLIENT_SECRET ?? "").trim(),
  ownerOpenId: (process.env.OWNER_OPEN_ID ?? "").trim(),
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: (process.env.BUILT_IN_FORGE_API_URL ?? "").trim(),
  forgeApiKey: (process.env.BUILT_IN_FORGE_API_KEY ?? "").trim(),
};
