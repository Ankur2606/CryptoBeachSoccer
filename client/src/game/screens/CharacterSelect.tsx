import { useState } from 'react';
import { useGameState } from '@/lib/stores/useGameState';
import { useCharacter } from '@/lib/stores/useCharacter';
import { Button } from '@/components/ui/button';
import { characterData } from '../models/character';
import { ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react';

const CharacterSelect = () => {
  const { setGameState } = useGameState();
  const { selectedCharacter, setSelectedCharacter } = useCharacter();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const characters = Object.values(characterData);
  
  const handleSelectCharacter = () => {
    setSelectedCharacter(characters[currentIndex].id);
    setGameState('playing');
  };
  
  const handlePrevCharacter = () => {
    setCurrentIndex(prev => prev === 0 ? characters.length - 1 : prev - 1);
  };
  
  const handleNextCharacter = () => {
    setCurrentIndex(prev => (prev + 1) % characters.length);
  };
  
  const handleBack = () => {
    setGameState('menu');
  };
  
  const currentCharacter = characters[currentIndex];
  
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-blue-500 to-cyan-300 flex flex-col items-center justify-center">
      <div className="absolute top-4 left-4 z-50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBack}
          className="text-white hover:bg-white/20"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      </div>
      
      <div className="relative z-10 bg-black/30 backdrop-blur-md p-8 rounded-xl shadow-xl border border-white/20 flex flex-col items-center max-w-lg w-full mx-4">
        <h1 className="text-3xl font-bold text-white mb-6">
          SELECT YOUR CHARACTER
        </h1>
        
        <div className="flex items-center justify-center w-full mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handlePrevCharacter}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          
          <div className="mx-4 flex-1 flex flex-col items-center">
            <div className="relative w-48 h-48 rounded-full bg-gradient-to-r from-gray-800/70 to-gray-900/70 flex items-center justify-center mb-4 border-4 border-white/30 overflow-hidden">
              <div className={`w-40 h-40 rounded-full ${getCharacterColor(currentCharacter.id)}`}>
                <div className="h-full w-full flex items-center justify-center">
                  {currentCharacter.id === 'bitcoin' && (
                    <div className="text-5xl">₿</div>
                  )}
                  {currentCharacter.id === 'ethereum' && (
                    <div className="text-5xl">Ξ</div>
                  )}
                  {currentCharacter.id === 'dogecoin' && (
                    <div className="text-5xl">Ð</div>
                  )}
                  {currentCharacter.id === 'pepecoin' && (
                    <div className="text-4xl">🐸</div>
                  )}
                </div>
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-1">
              {currentCharacter.name}
            </h2>
            
            <p className="text-white/80 text-center mb-4">
              {currentCharacter.description}
            </p>
            
            <div className="bg-black/30 p-3 rounded-lg w-full">
              <h3 className="text-yellow-400 font-bold mb-1">Special Ability:</h3>
              <p className="text-white text-sm">
                {currentCharacter.abilityName} - {currentCharacter.abilityDescription}
              </p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleNextCharacter}
            className="text-white hover:bg-white/20"
          >
            <ArrowRight className="h-6 w-6" />
          </Button>
        </div>
        
        <Button 
          size="lg" 
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold"
          onClick={handleSelectCharacter}
        >
          SELECT & PLAY
        </Button>
      </div>
    </div>
  );
};

// Helper function to get character color based on ID
function getCharacterColor(id: string): string {
  switch (id) {
    case 'bitcoin':
      return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white';
    case 'ethereum':
      return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
    case 'dogecoin':
      return 'bg-gradient-to-r from-orange-400 to-orange-500 text-white';
    case 'pepecoin':
      return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

export default CharacterSelect;
