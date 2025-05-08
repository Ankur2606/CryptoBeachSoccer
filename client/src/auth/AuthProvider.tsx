import React from 'react';

// Use try-catch to handle module resolution errors
let BedrockPassportProvider: React.ComponentType<any> | null = null;
try {
  // This import may fail in production builds
  const passport = require("@bedrock_org/passport");
  BedrockPassportProvider = passport.BedrockPassportProvider;
  // Also try to import CSS but don't throw if it fails
  try {
    require("@bedrock_org/passport/dist/style.css");
  } catch (e) {
    console.warn("Bedrock Passport CSS could not be loaded");
  }
} catch (e) {
  console.warn("Bedrock Passport could not be loaded - authentication features disabled");
}

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider Component
 * 
 * Wraps the application with Bedrock Passport authentication provider
 * to enable Orange ID authentication functionality
 */
const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // If Bedrock Passport is not available, just render children
  if (!BedrockPassportProvider) {
    return <>{children}</>;
  }

  // Determine the correct auth callback URL based on environment
  const isProduction = window.location.hostname !== "localhost";
  const authCallbackUrl = isProduction 
    ? "https://crypto-beach-soccer.netlify.app/auth/callback" 
    : "http://localhost:3000/auth/callback";

  return (
    <BedrockPassportProvider
      baseUrl="https://api.bedrockpassport.com"
      authCallbackUrl={authCallbackUrl}
      tenantId="orange-qrh9yonw24" // Replace with your actual tenant ID from Orange ID
    >
      {children}
    </BedrockPassportProvider>
  );
};

export default AuthProvider;