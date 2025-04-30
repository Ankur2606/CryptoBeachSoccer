import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Physics body types
type BodyShape = 'box' | 'sphere' | 'plane' | 'cylinder' | 'capsule';
type BodyType = 'dynamic' | 'static';

interface BodyOptions {
  position: [number, number, number];
  velocity?: [number, number, number];
  mass?: number;
  type?: BodyType;
  shape: BodyShape;
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  fixedRotation?: boolean;
  linearDamping?: number;
  angularDamping?: number;
  material?: {
    friction?: number;
    restitution?: number;
  };
  rotation?: [number, number, number];
  isTrigger?: boolean;
  userData?: any;
  onCollide?: (body: any) => void;
}

interface PhysicsStore {
  // State
  world: any; // Will hold CANNON.World
  bodies: Record<string, any>; // Will hold CANNON.Body instances by ID
  
  // Actions
  initPhysics: () => void;
  updatePhysics: (delta: number) => void;
  addBody: (options: BodyOptions) => any;
  removeBody: (bodyId: string) => void;
  getBody: (bodyId: string) => any;
  applyForce: (body: any, force: [number, number, number], point?: [number, number, number]) => void;
  
  // Cleanup
  cleanup: () => void;
}

export const usePhysics = create<PhysicsStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    world: null,
    bodies: {},
    
    // Initialize physics world
    initPhysics: () => {
      // Clean up any existing world
      const existingWorld = get().world;
      if (existingWorld) {
        console.log('Cleaning up existing physics world');
        get().cleanup();
      }

      // Check if CANNON is available (from CDN)
      if (typeof window === 'undefined' || !(window as any).CANNON) {
        console.error('CANNON.js not available, attempting to load it dynamically');
        
        // Check if we're already trying to load CANNON.js
        if ((window as any).__CANNON_LOADING) {
          console.log('CANNON.js is already being loaded, waiting...');
          return;
        }
        
        // Mark that we're loading CANNON.js
        (window as any).__CANNON_LOADING = true;
        
        // Add script element dynamically if not already loaded
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js';
        script.async = true;
        script.onload = () => {
          console.log('CANNON.js loaded dynamically');
          (window as any).__CANNON_LOADING = false;
          
          // Retry initialization after script loads
          setTimeout(() => get().initPhysics(), 100);
        };
        script.onerror = () => {
          console.error('Failed to load CANNON.js dynamically');
          (window as any).__CANNON_LOADING = false;
        };
        document.head.appendChild(script);
        return;
      }
      
      try {
        console.log('Initializing physics world with CANNON.js');
        const CANNON = (window as any).CANNON;
        
        // Create a new world
        const world = new CANNON.World();
        world.gravity.set(0, -9.81, 0); // Set gravity
        
        // Add a default ground plane
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 }); // Mass 0 = static body
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(
          new CANNON.Vec3(1, 0, 0), // Rotate around X axis
          -Math.PI / 2 // -90 degrees to face up
        );
        groundBody.position.set(0, -0.1, 0); // Slightly below y=0
        world.addBody(groundBody);
        
        // Configure world properties
        world.broadphase = new CANNON.NaiveBroadphase();
        world.solver.iterations = 10;
        
        // Store world reference
        set({ world });
        
        // Make world available globally for debugging
        (window as any).CANNON = CANNON;
        (window as any).physicsWorld = world;
        console.log('Physics world initialized successfully');
      } catch (error) {
        console.error('Failed to initialize physics world:', error);
      }
    },
    
    // Update physics simulation
    updatePhysics: (delta) => {
      const { world } = get();
      
      if (world) {
        // Step the physics world
        world.step(1/60, delta, 3);
        
        // Handle collisions
        handleCollisions(world);
      }
    },
    
    // Add a physics body to the world
    addBody: (options) => {
      const { world } = get();
      
      try {
        if (!world) {
          console.error('Physics world not initialized');
          // Try to initialize physics if not already done
          get().initPhysics();
          // If still not initialized, return null
          if (!get().world) {
            return null;
          }
        }
        
        if (!(window as any).CANNON) {
          console.error('CANNON.js not available when adding body');
          return null;
        }
        
        const CANNON = (window as any).CANNON;
        
        // Log for debugging
        console.log(`Creating ${options.shape} body, type: ${options.type || 'dynamic'}, userData:`, options.userData);
        
        // Create the shape based on type
        let shape;
        switch (options.shape) {
          case 'box':
            shape = new CANNON.Box(new CANNON.Vec3(
              options.width ? options.width / 2 : 0.5,
              options.height ? options.height / 2 : 0.5,
              options.depth ? options.depth / 2 : 0.5
            ));
            break;
          case 'sphere':
            shape = new CANNON.Sphere(options.radius || 0.5);
            break;
          case 'plane':
            shape = new CANNON.Plane();
            break;
          case 'cylinder':
            shape = new CANNON.Cylinder(
              options.radius || 0.5,
              options.radius || 0.5,
              options.height || 1,
              16
            );
            break;
          case 'capsule':
            // Simply use cylinder for capsule as it's more stable
            const radius = options.radius || 0.5;
            const height = options.height || 1;
            
            // Create cylinder directly - avoid compound shapes as they're unstable
            shape = new CANNON.Cylinder(radius, radius, height, 16);
            break;
          default:
            console.warn(`Unknown shape type: ${options.shape}, using box instead`);
            shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        }
        
        // Create body
        const bodyOptions: any = {
          mass: options.type === 'static' ? 0 : (options.mass || 1),
          position: new CANNON.Vec3(...options.position),
          shape,
        };
        
        // Add velocity if specified
        if (options.velocity) {
          bodyOptions.velocity = new CANNON.Vec3(...options.velocity);
        }
        
        // Add fixed rotation if specified
        if (options.fixedRotation) {
          bodyOptions.fixedRotation = options.fixedRotation;
        }
        
        // Add damping if specified
        if (options.linearDamping) {
          bodyOptions.linearDamping = options.linearDamping;
        }
        
        if (options.angularDamping) {
          bodyOptions.angularDamping = options.angularDamping;
        }
        
        // Create the physics body
        const body = new CANNON.Body(bodyOptions);
        
        // Set material properties if specified
        if (options.material) {
          const material = new CANNON.Material();
          
          if (options.material.friction !== undefined) {
            material.friction = options.material.friction;
          }
          
          if (options.material.restitution !== undefined) {
            material.restitution = options.material.restitution;
          }
          
          body.material = material;
        }
        
        // Set trigger property if specified
        if (options.isTrigger) {
          body.collisionResponse = false;
        }
        
        // Set rotation if specified
        if (options.rotation) {
          body.quaternion.setFromEuler(
            options.rotation[0],
            options.rotation[1],
            options.rotation[2],
            'XYZ'
          );
        }
        
        // Attach userData
        body.userData = options.userData || {};
        
        // Attach collision callback if specified
        if (options.onCollide) {
          body.userData.onCollide = options.onCollide;
        }
        
        // Add body to world
        world.addBody(body);
        
        // Store body in bodies map if it has an ID
        if (options.userData?.id) {
          set((state) => ({
            bodies: {
              ...state.bodies,
              [options.userData.id]: body
            }
          }));
        }
        
        return body;
      } catch (error) {
        console.error("Error adding physics body:", error, options);
        return null;
      }
    },
    
    // Remove a physics body from the world
    removeBody: (bodyId) => {
      const { world, bodies } = get();
      
      if (!world) return;
      
      // Find the body
      const body = bodies[bodyId];
      
      if (body) {
        // Remove from world
        world.removeBody(body);
        
        // Remove from bodies map
        set((state) => {
          const newBodies = { ...state.bodies };
          delete newBodies[bodyId];
          return { bodies: newBodies };
        });
      }
    },
    
    // Get a physics body by ID
    getBody: (bodyId) => {
      const { bodies } = get();
      return bodies[bodyId] || null;
    },
    
    // Apply force to a body
    applyForce: (body, force, point) => {
      if (!body) return;
      
      const CANNON = (window as any).CANNON;
      
      // Create force vector
      const forceVec = new CANNON.Vec3(...force);
      
      // Apply force at point or center of mass
      if (point) {
        const pointVec = new CANNON.Vec3(...point);
        body.applyForce(forceVec, pointVec);
      } else {
        body.applyForce(forceVec, body.position);
      }
    },
    
    // Cleanup physics world
    cleanup: () => {
      const { world } = get();
      
      if (world) {
        // Remove all bodies from world
        while (world.bodies.length > 0) {
          world.removeBody(world.bodies[0]);
        }
      }
      
      set({ world: null, bodies: {} });
    }
  }))
);

// Helper function to handle collisions
function handleCollisions(world: any) {
  // Get all active collision pairs
  const contacts = world.contacts;
  
  // Loop through contacts
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    
    // Get the two bodies involved
    const bodyA = contact.bi;
    const bodyB = contact.bj;
    
    // If either body has a collision callback, call it
    if (bodyA.userData?.onCollide) {
      bodyA.userData.onCollide(bodyB);
    }
    
    if (bodyB.userData?.onCollide) {
      bodyB.userData.onCollide(bodyA);
    }
  }
}
