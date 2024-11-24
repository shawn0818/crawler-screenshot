export class ResourceManager {
    private static instance: ResourceManager;
    private resources: Map<string, () => void> = new Map();
  
    private constructor() {}
  
    static getInstance(): ResourceManager {
      if (!ResourceManager.instance) {
        ResourceManager.instance = new ResourceManager();
      }
      return ResourceManager.instance;
    }
  
    registerResource(id: string, cleanup: () => void) {
      this.resources.set(id, cleanup);
    }
  
    cleanupResource(id: string) {
      const cleanup = this.resources.get(id);
      if (cleanup) {
        cleanup();
        this.resources.delete(id);
      }
    }
  
    cleanupAllResources() {
      this.resources.forEach((cleanup) => cleanup());
      this.resources.clear();
    }
  }
  
  export function useResourceCleanup() {
    return ResourceManager.getInstance();
  }