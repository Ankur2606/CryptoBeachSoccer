import React from 'react';
import { BedrockPassportProvider } from "@bedrock_org/passport";
import "@bedrock_org/passport/dist/style.css";

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
  return (
    <BedrockPassportProvider
      baseUrl="https://api.bedrockpassport.com"
      authCallbackUrl="https://crypto-beach-soccer.netlify.app/auth/callback" // Update this with your production URL when deployed
      tenantId="orange-qrh9yonw24" // Replace with your actual tenant ID from Orange ID
    >
      {children}
    </BedrockPassportProvider>
  );
};

export default AuthProvider;