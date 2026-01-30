/**
 * Grimm Dominion - Input System
 * Supports both mouse and touch input for desktop and mobile
 */

export class Input {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.camera = camera;

        this.onClick = null;
        this.onUIClick = null;
        this.onMouseMove = null;
        this.onZoom = null;
        this.keysDown = new Set();

        // Touch state for pinch-to-zoom
        this.touches = [];
        this.lastPinchDist = 0;
        this.isTouchDevice = false;

        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        document.body.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        // Prevent default touch behaviors on canvas
        this.canvas.addEventListener('touchcancel', (e) => e.preventDefault());

        // Keyboard events
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    /**
     * Handle canvas click
     * @param {MouseEvent} e - Mouse event
     */
    handleClick(e) {
        // Skip if touch device (touch events handle this)
        if (this.isTouchDevice) return;

        // Check if click is on a UI element
        const shopPanel = document.getElementById('shopPanel');
        if (shopPanel && shopPanel.contains(e.target)) {
            return;
        }

        const canvasPos = this.getCanvasCoordinates(e.clientX, e.clientY);
        if (this.onUIClick && this.onUIClick(canvasPos.x, canvasPos.y)) {
            return;
        }

        const adjusted = this.getAdjustedClientCoordinates(e.clientX, e.clientY);
        const worldPos = this.camera.screenToWorld(adjusted.clientX, adjusted.clientY, this.canvas);

        if (this.onClick) {
            this.onClick(worldPos.x, worldPos.y);
        }
    }

    /**
     * Handle touch start
     * @param {TouchEvent} e - Touch event
     */
    handleTouchStart(e) {
        this.isTouchDevice = true;
        e.preventDefault();

        this.touches = Array.from(e.touches);

        // Store initial pinch distance for two-finger zoom
        if (this.touches.length === 2) {
            this.lastPinchDist = this.getPinchDistance(this.touches);
        }
    }

    /**
     * Handle touch move
     * @param {TouchEvent} e - Touch event
     */
    handleTouchMove(e) {
        e.preventDefault();

        const currentTouches = Array.from(e.touches);

        // Pinch to zoom with two fingers
        if (currentTouches.length === 2) {
            const currentDist = this.getPinchDistance(currentTouches);

            if (this.lastPinchDist > 0) {
                const delta = currentDist - this.lastPinchDist;
                // Zoom in if fingers spread apart, out if pinching
                if (Math.abs(delta) > 5) {
                    const zoomDelta = delta > 0 ? 1 : -1;
                    this.camera.adjustZoom(zoomDelta * 0.5);
                    this.lastPinchDist = currentDist;
                }
            } else {
                this.lastPinchDist = currentDist;
            }
        }

        this.touches = currentTouches;
    }

    /**
     * Handle touch end
     * @param {TouchEvent} e - Touch event
     */
    handleTouchEnd(e) {
        e.preventDefault();

        const remainingTouches = Array.from(e.touches);

        // Single tap to move (when all fingers lifted and was single touch)
        if (remainingTouches.length === 0 && this.touches.length === 1) {
            const touch = e.changedTouches[0];

            // Check if touch ended on a UI element
            const shopPanel = document.getElementById('shopPanel');
            const touchTarget = document.elementFromPoint(touch.clientX, touch.clientY);
            if (shopPanel && shopPanel.contains(touchTarget)) {
                this.touches = [];
                this.lastPinchDist = 0;
                return;
            }

            const canvasPos = this.getCanvasCoordinates(touch.clientX, touch.clientY);
            if (this.onUIClick && this.onUIClick(canvasPos.x, canvasPos.y)) {
                this.touches = [];
                this.lastPinchDist = 0;
                return;
            }

            const adjusted = this.getAdjustedClientCoordinates(touch.clientX, touch.clientY);
            const worldPos = this.camera.screenToWorld(adjusted.clientX, adjusted.clientY, this.canvas);

            if (this.onClick) {
                this.onClick(worldPos.x, worldPos.y);
            }
        }

        this.touches = remainingTouches;
        if (remainingTouches.length < 2) {
            this.lastPinchDist = 0;
        }
    }

    /**
     * Calculate distance between two touch points
     * @param {Array} touches - Array of touch points
     * @returns {number} Distance in pixels
     */
    getPinchDistance(touches) {
        if (touches.length < 2) return 0;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
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
     * Handle key down
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if (['w', 'a', 's', 'd'].includes(key)) {
            this.keysDown.add(key);
        }
    }

    /**
     * Handle key up
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        if (['w', 'a', 's', 'd'].includes(key)) {
            this.keysDown.delete(key);
        }
    }

    /**
     * Get movement vector from WASD input
     * @returns {Object} Movement vector { x, y, active }
     */
    getMovementVector() {
        let x = 0;
        let y = 0;

        if (this.keysDown.has('a')) x -= 1;
        if (this.keysDown.has('d')) x += 1;
        if (this.keysDown.has('w')) y -= 1;
        if (this.keysDown.has('s')) y += 1;

        const length = Math.sqrt(x * x + y * y);
        if (length > 0) {
            x /= length;
            y /= length;
        }

        return {
            x,
            y,
            active: length > 0
        };
    }

    /**
     * Set click handler
     * @param {Function} callback - Callback function (worldX, worldY)
     */
    setClickHandler(callback) {
        this.onClick = callback;
    }

    /**
     * Set UI click handler
     * @param {Function} callback - Handler that returns true if click is handled
     */
    setUIClickHandler(callback) {
        this.onUIClick = callback;
    }

    /**
     * Convert client coordinates to canvas coordinates
     * @param {number} clientX
     * @param {number} clientY
     * @returns {{x: number, y: number}}
     */
    getCanvasCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const adjusted = this.getAdjustedClientCoordinates(clientX, clientY, rect);
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: adjusted.localX * scaleX,
            y: adjusted.localY * scaleY
        };
    }

    /**
     * Adjust client coordinates when the canvas is rotated in portrait mode.
     * @param {number} clientX
     * @param {number} clientY
     * @param {DOMRect} [rect]
     * @returns {{clientX: number, clientY: number, localX: number, localY: number}}
     */
    getAdjustedClientCoordinates(clientX, clientY, rect = null) {
        const bounds = rect ?? this.canvas.getBoundingClientRect();
        let localX = clientX - bounds.left;
        let localY = clientY - bounds.top;

        if (this.isPortraitRotated()) {
            const centerX = bounds.width / 2;
            const centerY = bounds.height / 2;
            const dx = localX - centerX;
            const dy = localY - centerY;
            const unrotatedX = -dy;
            const unrotatedY = dx;
            localX = unrotatedX + centerX;
            localY = unrotatedY + centerY;
        }

        return {
            clientX: bounds.left + localX,
            clientY: bounds.top + localY,
            localX,
            localY
        };
    }

    /**
     * Check if the canvas is rotated for portrait layout.
     * @returns {boolean}
     */
    isPortraitRotated() {
        return window.matchMedia && window.matchMedia('(orientation: portrait)').matches;
    }

    /**
     * Set mouse move handler
     * @param {Function} callback - Callback function (screenX, screenY)
     */
    setMouseMoveHandler(callback) {
        this.onMouseMove = callback;
    }

    /**
     * Set zoom handler
     * @param {Function} callback - Callback function (delta)
     */
    setZoomHandler(callback) {
        this.onZoom = callback;
    }
}
