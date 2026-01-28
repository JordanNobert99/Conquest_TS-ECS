export class GameLoop {
    private lastTime: number = 0;
    private accumulator: number = 0;
    private fixedTimeStep: number = 1 / 60; // 60 FPS
    private running: boolean = false;
    private animationFrameId: number = 0;

    constructor(
        private updateCallback: (deltaTime: number) => void,
        private fixedUpdateCallback: (fixedDeltaTime: number) => void,
        private drawCallback: () => void
    ) {}

    start(): void {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now() / 1000;
        this.loop(this.lastTime);
    }

    stop(): void {
        this.running = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    private loop = (currentTime: number): void => {
        if (!this.running) return;

        currentTime = currentTime / 1000; // Convert to seconds
        let deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Cap delta time to prevent spiral of death
        if (deltaTime > 0.25) {
            deltaTime = 0.25;
        }

        this.accumulator += deltaTime;

        // Fixed update loop
        while (this.accumulator >= this.fixedTimeStep) {
            this.fixedUpdateCallback(this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
        }

        // Variable update
        this.updateCallback(deltaTime);

        // Render
        this.drawCallback();

        this.animationFrameId = requestAnimationFrame(this.loop);
    };
}