import { useBedrockPassport } from '@bedrock_org/passport';
import { Button } from '@/components/ui/button';
import { useGameState } from '@/lib/stores/useGameState';
import { Coins, LogOut } from 'lucide-react';

interface UserProfileProps {
  onClose?: () => void;
}

/**
 * UserProfile Component
 * 
 * Displays the authenticated user's Orange ID profile information
 * in the game's pixelated retro style
 */
const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { user, isLoggedIn, signOut } = useBedrockPassport();
  const { setPlayerName } = useGameState();

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    setPlayerName('Guest');
    if (onClose) onClose();
  };

  if (!isLoggedIn || !user) {
    return (
      <div className="p-4 text-center">
        <p className="text-yellow-400 pixel-font">Not signed in</p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="bg-black/40 rounded-xl p-4 border-2 border-orange-500/30">
        <div className="flex flex-col items-center">
          <div className="relative">
            <img 
              src={user.picture || '/textures/ui/default-avatar.png'} 
              alt={user.displayName || 'Player'}
              className="w-20 h-20 rounded-full object-cover border-2 border-yellow-500"
            />
            {user.provider === 'google' && (
              <div className="absolute bottom-0 right-0 bg-white rounded-full p-1">
                <img src="https://cdn.cdnlogo.com/logos/g/35/google-icon.svg" alt="Google" className="w-4 h-4" />
              </div>
            )}
            {user.provider === 'apple' && (
              <div className="absolute bottom-0 right-0 bg-black rounded-full p-1">
                <img src="https://cdn.cdnlogo.com/logos/a/19/apple.svg" alt="Apple" className="w-4 h-4" />
              </div>
            )}
          </div>
          
          <h3 className="pixel-font text-yellow-400 mt-4 text-lg">{user.displayName || 'Crypto Player'}</h3>
          
          {user.ethAddress && (
            <div className="mt-2 bg-black/50 rounded-md px-2 py-1 text-yellow-300 font-mono text-xs flex items-center">
              <Coins className="h-3 w-3 mr-1" />
              {`${user.ethAddress.substring(0, 6)}...${user.ethAddress.substring(user.ethAddress.length - 4)}`}
            </div>
          )}
          
          <p className="text-white/70 text-xs mt-2 pixel-font">{user.email || ''}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-black/30 rounded-md p-2 text-center">
            <div className="text-xs text-white/60 pixel-font">Orange ID</div>
            <div className="text-sm text-orange-400 pixel-font truncate" title={user.id}>
              {user.id.substring(0, 8)}...
            </div>
          </div>
          <div className="bg-black/30 rounded-md p-2 text-center">
            <div className="text-xs text-white/60 pixel-font">Joined</div>
            <div className="text-sm text-orange-400 pixel-font">
              {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {user.bio && (
          <div className="mt-4 bg-black/30 rounded-md p-2">
            <div className="text-xs text-white/60 pixel-font mb-1">Bio</div>
            <div className="text-sm text-white/90 pixel-font">{user.bio}</div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSignOut}
            className="game-button flex items-center gap-1 pixel-font text-xs border-red-500/50 text-red-500/80 py-3"
          >
            <LogOut className="h-3 w-3" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;