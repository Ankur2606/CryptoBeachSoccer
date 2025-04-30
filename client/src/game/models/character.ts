// Character types and data

export interface CharacterData {
  id: string;
  name: string;
  description: string;
  color: string;
  abilityName: string;
  abilityDescription: string;
  abilityDuration: number;
  abilityCooldown: number;
}

export const characterData: Record<string, CharacterData> = {
  bitcoin: {
    id: 'bitcoin',
    name: 'Bitcoin',
    description: 'Golden coin head, male body in orange swim trunks with sunglasses.',
    color: '#f7931a',
    abilityName: 'Hodl',
    abilityDescription: 'Become immovable for 3 seconds, perfect for blocking opponent or ball.',
    abilityDuration: 3,
    abilityCooldown: 15
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    description: 'Silver coin head, female body in purple bikini with flip-flops.',
    color: '#627eea',
    abilityName: 'Smart Contract',
    abilityDescription: 'Spawns a temporary barrier to block the ball or opponent for 3 seconds.',
    abilityDuration: 3,
    abilityCooldown: 15
  },
  dogecoin: {
    id: 'dogecoin',
    name: 'Dogecoin',
    description: 'Bronze coin with Shiba Inu face, male body in red swimsuit.',
    color: '#c2a633',
    abilityName: 'To the Moon',
    abilityDescription: 'Gain a 5-second speed boost for fast movement across the field.',
    abilityDuration: 5,
    abilityCooldown: 15
  },
  pepecoin: {
    id: 'pepecoin',
    name: 'PepeCoin',
    description: 'Green coin head, female body in green frog-patterned swimsuit.',
    color: '#3cbc98',
    abilityName: 'Meme Magic',
    abilityDescription: 'Reverse opponent controls for 3 seconds, causing confusion.',
    abilityDuration: 3,
    abilityCooldown: 15
  }
};

// Character abilities implementation
export type AbilityEffect = {
  apply: () => void;
  remove: () => void;
};

export const characterAbilities: Record<string, () => AbilityEffect> = {
  bitcoin: () => ({
    apply: () => {
      // Make player immovable by increasing mass temporarily
      const playerBody = (window as any).CANNON?.bodies?.find(
        (body: any) => body.userData?.bodyId === 'player_character'
      );
      if (playerBody) {
        playerBody.originalMass = playerBody.mass;
        playerBody.mass = 1000; // Extremely heavy
        playerBody.updateMassProperties();
      }
    },
    remove: () => {
      // Restore original mass
      const playerBody = (window as any).CANNON?.bodies?.find(
        (body: any) => body.userData?.bodyId === 'player_character'
      );
      if (playerBody && playerBody.originalMass) {
        playerBody.mass = playerBody.originalMass;
        playerBody.updateMassProperties();
      }
    }
  }),
  
  ethereum: () => ({
    apply: () => {
      // Create barrier in front of player
      const playerBody = (window as any).CANNON?.bodies?.find(
        (body: any) => body.userData?.bodyId === 'player_character'
      );
      if (playerBody) {
        const barrierBody = new (window as any).CANNON.Body({
          mass: 0, // Static body
          position: new (window as any).CANNON.Vec3(
            playerBody.position.x,
            playerBody.position.y,
            playerBody.position.z - 2 // In front of player
          ),
          shape: new (window as any).CANNON.Box(new (window as any).CANNON.Vec3(3, 2, 0.2))
        });
        barrierBody.userData = { type: 'barrier', temporary: true };
        (window as any).CANNON.world.addBody(barrierBody);
      }
    },
    remove: () => {
      // Remove temporary barrier
      const barrierBody = (window as any).CANNON?.bodies?.find(
        (body: any) => body.userData?.type === 'barrier' && body.userData?.temporary
      );
      if (barrierBody) {
        (window as any).CANNON.world.removeBody(barrierBody);
      }
    }
  }),
  
  dogecoin: () => ({
    apply: () => {
      // Increase player movement speed
      (window as any).PLAYER_SPEED_BOOST = 2.0; // 2x speed
    },
    remove: () => {
      // Reset speed boost
      (window as any).PLAYER_SPEED_BOOST = 1.0;
    }
  }),
  
  pepecoin: () => ({
    apply: () => {
      // Reverse AI controls
      (window as any).AI_CONTROLS_REVERSED = true;
    },
    remove: () => {
      // Reset AI controls
      (window as any).AI_CONTROLS_REVERSED = false;
    }
  })
};
