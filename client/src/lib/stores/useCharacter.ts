import { create } from 'zustand';
import { characterAbilities, characterData } from '@/game/models/character';

interface CharacterStore {
  // State
  selectedCharacter: string;
  isAbilityActive: boolean;
  activeAbilityTimeout: NodeJS.Timeout | null;
  cooldownRemaining: number;
  cooldownInterval: NodeJS.Timeout | null;
  
  // Actions
  setSelectedCharacter: (character: string) => void;
  activateAbility: (character: string) => void;
  deactivateAbility: () => void;
  startCooldown: () => void;
}

export const useCharacter = create<CharacterStore>((set, get) => ({
  // Initial state
  selectedCharacter: 'bitcoin', // Default character
  isAbilityActive: false,
  activeAbilityTimeout: null,
  cooldownRemaining: 0,
  cooldownInterval: null,
  
  // Actions
  setSelectedCharacter: (character) => set({ selectedCharacter: character }),
  
  activateAbility: (character) => {
    const { isAbilityActive, cooldownRemaining } = get();
    
    // Only activate if not already active and not in cooldown
    if (!isAbilityActive && cooldownRemaining <= 0) {
      // Get character data
      const characterInfo = characterData[character];
      if (!characterInfo) return;
      
      // Get and apply ability effect
      const ability = characterAbilities[character];
      if (ability) {
        const effect = ability();
        effect.apply();
        
        // Set ability as active
        set({ isAbilityActive: true });
        
        // Set timeout to deactivate ability
        const timeout = setTimeout(() => {
          effect.remove();
          get().deactivateAbility();
        }, characterInfo.abilityDuration * 1000);
        
        set({ activeAbilityTimeout: timeout });
      }
    }
  },
  
  deactivateAbility: () => {
    const { activeAbilityTimeout } = get();
    
    // Clear timeout if exists
    if (activeAbilityTimeout) {
      clearTimeout(activeAbilityTimeout);
    }
    
    // Set ability as inactive and start cooldown
    set({ 
      isAbilityActive: false,
      activeAbilityTimeout: null
    });
    
    // Start cooldown
    get().startCooldown();
  },
  
  startCooldown: () => {
    const { cooldownInterval } = get();
    const { selectedCharacter } = get();
    const characterInfo = characterData[selectedCharacter];
    
    // Clear any existing interval
    if (cooldownInterval) {
      clearInterval(cooldownInterval);
    }
    
    // Set initial cooldown
    set({ cooldownRemaining: characterInfo.abilityCooldown });
    
    // Create interval to update cooldown
    const interval = setInterval(() => {
      const { cooldownRemaining } = get();
      
      if (cooldownRemaining <= 0) {
        // Cooldown complete
        const { cooldownInterval } = get();
        if (cooldownInterval) {
          clearInterval(cooldownInterval);
          set({ cooldownInterval: null });
        }
      } else {
        // Reduce cooldown by 0.1 seconds
        set({ cooldownRemaining: cooldownRemaining - 0.1 });
      }
    }, 100);
    
    set({ cooldownInterval: interval });
  }
}));
