import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useGameState } from '@/lib/stores/useGameState';

interface LoginModalProps {
  onClose: () => void;
}

const LoginModal = ({ onClose }: LoginModalProps) => {
  const [username, setUsername] = useState('');
  const { setPlayerName, setGameState } = useGameState();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (username.trim()) {
      setPlayerName(username.trim());
      setGameState('character_select');
      onClose();
    }
  };
  
  const handlePlayAsGuest = () => {
    setPlayerName('Guest');
    setGameState('character_select');
    onClose();
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Enter Your Name</Label>
        <Input
          id="username"
          placeholder="Beach Striker"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
        />
      </div>
      
      <div className="flex gap-3 justify-end">
        <Button 
          type="button" 
          variant="outline"
          onClick={handlePlayAsGuest}
        >
          Play as Guest
        </Button>
        
        <Button type="submit" disabled={!username.trim()}>
          Play Now
        </Button>
      </div>
    </form>
  );
};

export default LoginModal;
