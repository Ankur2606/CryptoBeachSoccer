import { useState } from 'react';
import { useBedrockPassport } from '@bedrock_org/passport';
import { useGameState } from '@/lib/stores/useGameState';
import OrangeLoginPanel from '@/auth/OrangeLoginPanel';

interface LoginModalProps {
  onClose: () => void;
}

const LoginModal = ({ onClose }: LoginModalProps) => {
  const { setPlayerName, setGameState } = useGameState();
  const { isLoggedIn, user } = useBedrockPassport();
  
  const handlePlayAsGuest = () => {
    setPlayerName('Guest');
    setGameState('character_select');
    onClose();
  };
  
  const handleLoginSuccess = () => {
    // If user is logged in, use their display name from Orange ID
    if (isLoggedIn && user) {
      setPlayerName(user.displayName || user.name || 'Crypto Player');
    }
    setGameState('character_select');
    onClose();
  };
  
  return (
    <div className="space-y-6 relative">
      {/* Decorative beach elements */}
      <div className="absolute -top-4 -left-4 w-16 h-16 bg-yellow-400 rounded-full opacity-50 -z-10"></div>
      <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-cyan-500 rounded-full opacity-40 -z-10"></div>
      
      <OrangeLoginPanel 
        onClose={handleLoginSuccess} 
        onGuestLogin={handlePlayAsGuest} 
      />
    </div>
  );
};

export default LoginModal;
