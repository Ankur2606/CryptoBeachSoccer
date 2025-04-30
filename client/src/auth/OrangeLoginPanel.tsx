import React from 'react';
import { useBedrockPassport, LoginPanel } from "@bedrock_org/passport";
import { Button } from '@/components/ui/button';

interface OrangeLoginPanelProps {
  onClose?: () => void;
  onGuestLogin?: () => void;
}

/**
 * OrangeLoginPanel Component
 * 
 * A customized login panel for Crypto Beach Soccer using Orange ID authentication
 */
const OrangeLoginPanel: React.FC<OrangeLoginPanelProps> = ({ onClose, onGuestLogin }) => {
  const { isLoggedIn, user, signOut } = useBedrockPassport();

  const handleGuestLogin = () => {
    if (onGuestLogin) {
      onGuestLogin();
    }
  };

  return (
    <div className="space-y-6">
      {isLoggedIn && user ? (
        <div className="space-y-4">
          <div className="text-center">
            <img 
              src={user.picture || '/textures/ui/default-avatar.png'} 
              alt={user.displayName || 'Player'}
              className="w-20 h-20 rounded-full mx-auto border-2 border-yellow-400"
            />
            <h3 className="pixel-font text-yellow-400 mt-2">{user.displayName || 'Crypto Player'}</h3>
            <p className="text-sm text-white/70 pixel-font">{user.email || ''}</p>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => onClose && onClose()}
              className="game-button pixel-font bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-blue-500 py-5"
            >
              Continue as {user.displayName || 'Player'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => signOut()}
              className="game-button pixel-font border-white text-blue-500 py-5"
            >
              Sign Out
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-black/40 backdrop-blur-sm p-5 rounded-xl border-2 border-orange-500/50">
            <LoginPanel
              title="Sign in to"
              logo="https://irp.cdn-website.com/e81c109a/dms3rep/multi/orange-web3-logo-v2a-20241018.svg"
              logoAlt="Orange Web3"
              walletButtonText="Connect Wallet"
              showConnectWallet={false}
              separatorText="OR"
              features={{
                enableWalletConnect: false,
                enableAppleLogin: true,
                enableGoogleLogin: true,
                enableEmailLogin: false,
              }}
              titleClass="pixel-font text-xl font-bold text-yellow-400"
              logoClass="ml-2 md:h-8 h-6"
              panelClass="container p-2 md:p-4 rounded-xl max-w-[480px] bg-transparent"
              buttonClass="hover:border-orange-500 pixel-font py-3"
              separatorTextClass="bg-transparent text-yellow-300 pixel-font text-xs"
              separatorClass="bg-yellow-500/30"
              linkRowClass="justify-center mt-4"
              headerClass="justify-center mb-6"
            />
          </div>
          
          <div className="text-center">
            <div className="pixel-font text-xs text-white/70 mb-3">
              Don't want to sign up?
            </div>
            
            <Button 
              variant="outline" 
              onClick={handleGuestLogin}
              className="game-button pixel-font border-white text-blue-500 py-5 w-full"
            >
              Continue as Guest
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrangeLoginPanel;