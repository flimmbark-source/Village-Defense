/**
 * Grimm Dominion - Input System
 */

export class Input {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.camera = camera;

        this.onClick = null;
        this.onMouseMove = null;

        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        document.body.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    }

    /**
     * Handle canvas click
     * @param {MouseEvent} e - Mouse event
     */
    handleClick(e) {
        // Check if click is on a UI element
        const shopPanel = document.getElementById('shopPanel');
        if (shopPanel && shopPanel.contains(e.target)) {
            return;
        }

        const worldPos = this.camera.screenToWorld(e.clientX, e.clientY, this.canvas);

        if (this.onClick) {
            this.onClick(worldPos.x, worldPos.y);
        }
    }

    /**
     * Handle mouse move
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        if (this.onMouseMove) {
            this.onMouseMove(e.clientX, e.clientY);
        }
    }

    /**
     * Set click handler
     * @param {Function} callback - Callback function (worldX, worldY)
     */
    setClickHandler(callback) {
        this.onClick = callback;
    }

    /**
     * Set mouse move handler
     * @param {Function} callback - Callback function (screenX, screenY)
     */
    setMouseMoveHandler(callback) {
        this.onMouseMove = callback;
    }
}
