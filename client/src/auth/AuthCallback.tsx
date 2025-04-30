import { useEffect } from 'react';
import { useBedrockPassport } from "@bedrock_org/passport";
import { useNavigate } from 'react-router-dom';

/**
 * AuthCallback Component
 * 
 * Handles the authentication callback from Orange ID
 * Processes the token and redirects the user after successful login
 */
function AuthCallback() {
  const { loginCallback } = useBedrockPassport();
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogin = async (token: string, refreshToken: string) => {
      const success = await loginCallback(token, refreshToken);
      if (success) {
        // Redirect to the main menu after successful login
        navigate('/');
      }
    };

    // Extract token parameters from URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const refreshToken = params.get("refreshToken");

    if (token && refreshToken) {
      handleLogin(token, refreshToken);
    } else {
      // If no tokens found, redirect back to login
      navigate('/');
    }
  }, [loginCallback, navigate]);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-blue-600 to-cyan-400 flex flex-col items-center justify-center">
      <div className="game-panel p-8 rounded-xl flex flex-col items-center">
        <h1 className="game-title text-yellow-400 mb-6">Signing In...</h1>
        <div className="pixel-font text-white">Please wait while we authenticate your account</div>
        
        {/* Loading animation */}
        <div className="mt-6 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
        </div>
      </div>
    </div>
  );
}

export default AuthCallback;