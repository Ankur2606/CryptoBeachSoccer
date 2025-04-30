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
  model?: string; // Add model property for 3D characters
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
  },
  gigachad: {
    id: 'gigachad',
    name: 'Giga Chad',
    description: 'The ultimate beach hunk whose jawline could cut diamonds. Known for his irresistible charm and impressive pecs.',
    color: '#ff6347', // Tomato red
    abilityName: 'Womanizer',
    abilityDescription: 'Makes opponents magnetically attracted to him for 3 seconds, impossible to resist his charm!',
    abilityDuration: 3,
    abilityCooldown: 15,
    model: 'male_beach.glb'
  },
  beachbaddy: {
    id: 'beachbaddy',
    name: 'Beach Baddy',
    description: 'A stunning diva whose beauty is so mesmerizing that opponents freeze just by looking at her.',
    color: '#ff69b4', // Hot pink
    abilityName: 'Captivating Presence',
    abilityDescription: 'Freezes opponents in place for 2 seconds with her stunning beach swagger.',
    abilityDuration: 2,
    abilityCooldown: 12,
    model: 'female_beach.glb'
  }
};

// Character abilities implementation
export type AbilityEffect = {
  apply: () => void;
  remove: () => void;
};

// Export the character abilities object correctly
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
  }),

  // Add Giga Chad's "Womanizer" ability
  gigachad: () => ({
    apply: () => {
      // Play sleazy whistle sound effect
      const audio = new Audio('/sounds/whistle.mp3');
      audio.volume = 0.7;
      audio.play();
      
      // Store the audio for later cleanup
      (window as any).ABILITY_AUDIO = audio;
      
      // Make opponents stick to Giga Chad (magnetic effect)
      const playerBody = (window as any).CANNON?.bodies?.find(
        (body: any) => body.userData?.bodyId === 'player_character'
      );
      
      const aiBody = (window as any).CANNON?.bodies?.find(
        (body: any) => body.userData?.bodyId === 'ai_character'
      );
      
      // Enable sticky effect
      if (playerBody && aiBody) {
        console.log("Activating Giga Chad's Womanizer ability");
        
        // Create a strong attractive force between AI and player
        (window as any).GIGACHAD_ATTRACTION_ENABLED = true;
        
        // Create a interval to constantly move the AI toward the player
        const attractionInterval = setInterval(() => {
          if ((window as any).GIGACHAD_ATTRACTION_ENABLED && aiBody && playerBody) {
            // Calculate direction vector from AI to player
            const direction = {
              x: playerBody.position.x - aiBody.position.x,
              y: playerBody.position.y - aiBody.position.y,
              z: playerBody.position.z - aiBody.position.z
            };
            
            // Normalize and apply attractive force
            const distance = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
            
            if (distance > 0.5) {  // Don't apply force if too close
              const force = 10; // Attractive force strength
              aiBody.applyForce(
                new (window as any).CANNON.Vec3(
                  (direction.x / distance) * force,
                  (direction.y / distance) * force,
                  (direction.z / distance) * force
                ),
                aiBody.position
              );
            }
          }
        }, 50);
        
        // Store reference to remove later
        (window as any).GIGACHAD_ATTRACTION_INTERVAL = attractionInterval;
      }
    },
    remove: () => {
      console.log("Deactivating Giga Chad's Womanizer ability");
      
      // Stop attraction effect
      (window as any).GIGACHAD_ATTRACTION_ENABLED = false;
      
      // Clear the interval
      if ((window as any).GIGACHAD_ATTRACTION_INTERVAL) {
        clearInterval((window as any).GIGACHAD_ATTRACTION_INTERVAL);
        (window as any).GIGACHAD_ATTRACTION_INTERVAL = null;
      }
      
      // Stop sound effect if playing
      if ((window as any).ABILITY_AUDIO) {
        (window as any).ABILITY_AUDIO.pause();
        (window as any).ABILITY_AUDIO = null;
      }
    }
  }),
  
  // Add Beach Baddy's "Captivating Presence" ability
  beachbaddy: () => ({
    apply: () => {
      // Play freeze sound effect
      const audio = new Audio('/sounds/freeze.mp3');
      audio.volume = 0.7;
      audio.play();
      
      // Store the audio for later cleanup
      (window as any).ABILITY_AUDIO = audio;
      
      // Freeze opponent in place
      const aiBody = (window as any).CANNON?.bodies?.find(
        (body: any) => body.userData?.bodyId === 'ai_character'
      );
      
      if (aiBody) {
        console.log("Activating Beach Baddy's Captivating Presence ability");
        
        // Store original properties to restore later
        (window as any).AI_ORIGINAL_VELOCITY = {
          x: aiBody.velocity.x,
          y: aiBody.velocity.y,
          z: aiBody.velocity.z
        };
        
        // Freeze by setting velocity to zero
        aiBody.velocity.setZero();
        aiBody.angularVelocity.setZero();
        
        // Store original mass and increase it temporarily to prevent movement
        (window as any).AI_ORIGINAL_MASS = aiBody.mass;
        aiBody.mass = 1000; // Make extremely heavy to prevent movement
        aiBody.updateMassProperties();
        
        // Create a visual effect
        (window as any).BEACH_BADDY_FREEZE_ENABLED = true;
        
        // Apply an additional force to stop AI completely
        const forceInterval = setInterval(() => {
          if ((window as any).BEACH_BADDY_FREEZE_ENABLED && aiBody) {
            // Reset velocity continuously during the effect
            aiBody.velocity.setZero();
            aiBody.angularVelocity.setZero();
          }
        }, 50);
        
        // Store reference to remove later
        (window as any).BEACH_BADDY_FORCE_INTERVAL = forceInterval;
      }
    },
    remove: () => {
      console.log("Deactivating Beach Baddy's Captivating Presence ability");
      
      // Unfreeze opponent
      const aiBody = (window as any).CANNON?.bodies?.find(
        (body: any) => body.userData?.bodyId === 'ai_character'
      );
      
      if (aiBody) {
        // Restore original mass
        if ((window as any).AI_ORIGINAL_MASS !== undefined) {
          aiBody.mass = (window as any).AI_ORIGINAL_MASS;
          aiBody.updateMassProperties();
        }
        
        // Clear the interval
        if ((window as any).BEACH_BADDY_FORCE_INTERVAL) {
          clearInterval((window as any).BEACH_BADDY_FORCE_INTERVAL);
          (window as any).BEACH_BADDY_FORCE_INTERVAL = null;
        }
        
        // Reset flag
        (window as any).BEACH_BADDY_FREEZE_ENABLED = false;
      }
      
      // Stop sound effect if playing
      if ((window as any).ABILITY_AUDIO) {
        (window as any).ABILITY_AUDIO.pause();
        (window as any).ABILITY_AUDIO = null;
      }
    }
  })
};
