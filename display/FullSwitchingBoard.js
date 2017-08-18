define(['core/document_utils', 'core/EventObject', './Full2DBoard', './Full3DBoard'], (docutil, EventObject, Full2DBoard, Full3DBoard) => {
	'use strict';

	return class FullSwitchingBoard extends EventObject {
		constructor({renderer, markerStore = null, markerTypes3D = null, begin3D = false, scaleX = 1, scaleY = null}) {
			super();

			this.renderer = renderer;
			this.markerStore = markerStore;
			this.markerTypes3D = markerTypes3D;
			this.board2D = null;
			this.board3D = null;
			this.active = null;
			this.latestWidth = 0;
			this.latestHeight = 0;

			this.animationTime = 1000;

			this.target = begin3D ? 1 : 0;
			this.blockFirstAnim = (begin3D === null);
			this.currentFrac = this.target;
			this.drawnFrac = 0;
			this.animFrame = null;
			this.lastFrame = 0;
			this.wireframe = false;

			this.container = docutil.make('div');

			this._animate = this._animate.bind(this);

			this.setScale(scaleX, scaleY);
			this._updateRendered();
		}

		_updateSizes() {
			if(this.board3D) {
				const ww = (this.latestWidth * this.scaleX)|0;
				const hh = (this.latestHeight * this.scaleY)|0;
				this.board3D.resize(ww, hh);
			}
			if(this.board2D) {
				this.board2D.setScale(this.scaleX, this.scaleY);
			}
		}

		_make2DBoard() {
			if(!this.board2D) {
				this.board2D = new Full2DBoard({
					renderer: this.renderer,
					markerStore: this.markerStore,
					scaleX: this.scaleX,
					scaleY: this.scaleY
				});
			}
		}

		_make3DBoard() {
			if(!this.board3D) {
				const ww = (this.latestWidth * this.scaleX)|0;
				const hh = (this.latestHeight * this.scaleY)|0;
				this.board3D = new Full3DBoard({
					renderer: this.renderer,
					markerStore: this.markerStore,
					markerTypes: this.markerTypes3D,
					width: ww,
					height: hh
				});
				this.board3D.setWireframe(this.wireframe);
			}
		}

		_updateRendered() {
			const is3D = this.currentFrac > 0;
			if(is3D && !this.board3D) {
				this._make3DBoard();
			}
			if(!is3D && !this.board2D) {
				this._make2DBoard();
			}

			if(is3D && this.drawnFrac !== this.currentFrac) {
				this.drawnFrac = this.currentFrac;
				const smoothedFrac = 0.5 - Math.cos(this.currentFrac * Math.PI) * 0.5;
				this.board3D.updateTorus(smoothedFrac);
				if(this.active === this.board3D) {
					this.board3D.rerender();
				}
			}

			const desired = (is3D ? this.board3D : this.board2D);
			if(this.active !== desired) {
				if(this.active) {
					this.container.removeChild(this.active.dom());
				}
				this.container.appendChild(desired.dom());
				this.active = desired;
				this.active.repaint();
			}
		}

		_animate() {
			this.animFrame = null;
			const now = Date.now();
			const delta = now - this.lastFrame;
			this.lastFrame = now;

			let complete = false;
			if(this.currentFrac < this.target) {
				this.currentFrac += delta / this.animationTime;
				if(this.currentFrac >= this.target) {
					complete = true;
				}
			} else {
				this.currentFrac -= delta / this.animationTime;
				if(this.currentFrac <= this.target) {
					complete = true;
				}
			}
			if(complete) {
				this.currentFrac = this.target;
			} else {
				this.animFrame = requestAnimationFrame(this._animate);
			}
			this._updateRendered();
		}

		setMarkerStore(markerStore) {
			this.markerStore = markerStore;
			if(this.board2D) {
				this.board2D.setMarkerStore(this.markerStore);
			}
			if(this.board3D) {
				this.board3D.setMarkerStore(this.markerStore);
			}
		}

		setmarkerTypes3D(markerTypes3D) {
			this.markerTypes3D = markerTypes3D;
			if(this.board3D) {
				this.board3D.setmarkerTypes(this.markerTypes3D);
			}
		}

		setScale(x, y = null) {
			if(y === null) {
				y = x;
			}
			this.scaleX = x;
			this.scaleY = y;
			this._updateSizes();
		}

		setWireframe(on) {
			this.wireframe = on;
			if(this.board3D) {
				this.board3D.setWireframe(on);
			}
		}

		rerender() {
			if(this.active) {
				this.active.rerender();
			}
		}

		repaint() {
			const data = this.renderer.getImageData();
			if(data) {
				this.latestWidth = data.width;
				this.latestHeight = data.height;
				this._updateSizes();
				if(!this.board3D) {
					// Prepare 3D board in advance to avoid glitchy animation
					// (might be worth using requestIdleCallback, but we can't
					// control how long it will take to build the canvas)
					setTimeout(this._make3DBoard.bind(this), 0);
				}
			}
			if(this.active) {
				this.active.repaint();
			}
		}

		is3D() {
			return this.target > 0;
		}

		switch3D(on, animated = true) {
			if(this.target === (on ? 1 : 0)) {
				this.blockFirstAnim = false;
				return;
			}
			this.target = (on ? 1 : 0);
			if(animated && !this.blockFirstAnim) {
				if(!this.animFrame) {
					this.lastFrame = Date.now();
					this.animFrame = requestAnimationFrame(this._animate);
				}
			} else {
				if(this.animFrame) {
					cancelAnimationFrame(this.animFrame);
					this.animFrame = null;
				}
				this.currentFrac = this.target;
				this._updateRendered();
			}
			this.blockFirstAnim = false;
		}

		dom() {
			return this.container;
		}
	}
});