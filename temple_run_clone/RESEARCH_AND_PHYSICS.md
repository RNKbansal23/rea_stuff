# Temple Run: Reverse Engineering & Physics Specification

This document details the reverse-engineered mechanics, physics formulations, motion models, and rendering pipelines used in the 3D WebGL Temple Run Clone.

---

## 1. Coordinate System & World Hierarchy

- **Coordinate System**: Right-Handed Cartesian 3D (Three.js standard).
  - $+X$: Right lateral axis.
  - $+Y$: Up vertical axis (gravity acts in $-Y$).
  - $-Z$: Forward traversal axis (runner travels toward $-Z$, or world tiles scroll $+Z$).
- **Lane Discretization**:
  - 3 primary lanes: Left ($X = -2.5\text{m}$), Center ($X = 0\text{m}$), Right ($X = +2.5\text{m}$).
  - Lane width: $2.5\text{m}$ each; Total track width: $8.0\text{m}$ with stone parapets on edges.
  - Lateral motion uses **critical damping interpolation** ($\text{lerp}(x, x_{target}, 1 - e^{-\lambda \Delta t})$) to ensure smooth, responsive transitions when pressing `A` / `D` or `ArrowLeft` / `ArrowRight`.

---

## 2. Kinematic & Dynamic Physics Models

### A. Forward Acceleration
- Initial Velocity: $v_0 = 16.0\,\text{m/s}$.
- Acceleration: $a = 0.15\,\text{m/s}^2$ up to terminal velocity $v_{\max} = 34.0\,\text{m/s}$.
- Position update: $z(t + \Delta t) = z(t) - v(t) \cdot \Delta t$.

### B. Vertical Jump Mechanics
- Initial jump impulse velocity: $v_{y0} = 12.5\,\text{m/s}$.
- Gravitational downward acceleration: $g = -32.0\,\text{m/s}^2$ (tuned higher than Earth gravity $9.8$ for crisp arcade responsiveness, eliminating "floatiness").
- Jump duration:
  $$t_{\text{air}} = \frac{2 \cdot v_{y0}}{|g|} \approx \frac{25.0}{32.0} \approx 0.78\,\text{seconds}$$
- Peak apex height:
  $$h_{\max} = \frac{v_{y0}^2}{2|g|} = \frac{156.25}{64.0} \approx 2.44\,\text{meters}$$
- Clears obstacles up to $1.8\text{m}$ tall (such as fallen ancient tree trunks, spiked barricades, and broken bridge gaps).

### C. Slide Mechanics
- Slide duration: $0.85\,\text{seconds}$.
- Normal Player Collision Box: Height $= 1.9\text{m}$, Width $= 0.8\text{m}$, Depth $= 0.8\text{m}$.
- Sliding Collision Box: Height reduced to $0.65\text{m}$, Center shifted down to $Y = 0.35\text{m}$.
- Camera dips down by $-0.4\text{m}$ and pitches down slightly to intensify the sensation of speed underneath low stone arches and flaming rings.

### D. 90-Degree Intersection Turns
- Approaching a T-junction or L-turn, the player has a trigger window of $6.0\text{m}$ before and $3.0\text{m}$ after the pivot.
- Pressing `Left` or `Right` initiates an exact $\frac{\pi}{2}$ radian camera and trajectory rotation with camera roll damping.

---

## 3. Obstacle Architecture & Collision System

1. **Tree Trunk / Stone Barricade (Jump Requirement)**:
   - Elevation: $Y \in [0, 1.2]\text{m}$.
   - Failure: Player collided while $Y_{\text{player}} < 1.1\text{m} \implies$ Stumble or Death.
2. **Ancient Stone Arch / Fire Ring (Slide Requirement)**:
   - Clearance: $Y \in [0.8, 3.0]\text{m}$.
   - Failure: Player collided while $\text{isSliding} = \text{false} \implies$ Head impact!
3. **Broken Bridge / Chasm (Jump Requirement)**:
   - Pit gap length: $5.0\text{m} - 7.0\text{m}$.
   - Failure: Ground raycast returns null $\implies$ Freefall into the abyss.
4. **Side Edge Parapets & Abyss**:
   - If player moves outside $[-3.8\text{m}, +3.8\text{m}]$ over open cliffs $\implies$ Fall off track.

---

## 4. Collectibles & Powerups

- **Spinning Golden Coins**:
  - Placed in parabolic arcs (rewarding jumps) and straight 3-lane trails.
  - Mesh: Octagonal golden coin with ancient Aztec glyph embossing.
  - Rotation: Procedural $Y$-axis spin ($4.5\,\text{rad/s}$) with sinusoidal floating hover $Y(t) = Y_0 + 0.15 \cdot \sin(5t)$.
  - Magnet Attraction: When Magnet powerup is active, coins within $12\text{m}$ accelerate toward player using inverse square pull.
- **Powerups**:
  - **Coin Magnet**: Pulls coins from all lanes for 10 seconds.
  - **Invisibility / Shield**: Protects against 1 obstacle hit.
  - **Boost**: Supercharged rocket dash running automatically at $2\times$ speed invulnerable.

---

## 5. Evil Demon Monkey Pursuit System

- Follows the player from behind at distance $D_{\text{monkey}} = 7.0\text{m}$.
- If player trips or grazes an obstacle without dying, $D_{\text{monkey}}$ surges to $2.5\text{m}$ with ferocious growling!
- If another stumble occurs within 5 seconds $\implies$ Demon monkey catches player (Game Over).
- Flawless running gradually resets monkey back to $7.0\text{m}$.

---

## 6. Procedural Web Audio API Sound System

- Footsteps on ancient stone: Rhythmic acoustic low-frequency impacts synchronized with running cadence.
- Jump Whoosh: Filtered noise sweep from $300\text{Hz}$ to $1800\text{Hz}$.
- Slide Swoosh: Low-pass friction noise ramping down.
- Coin Chime: Dual high sine oscillators ($1318\text{Hz}$ / $1760\text{Hz}$, E6 / A6 chord) with $0.15\text{s}$ exponential decay.
- Demon Monkey Roar: Distorted sawtooth oscillator with slow LFO pitch modulation.
- Stumble Thump: Deep square wave transient.

---

## 7. Camera Dynamics

- Position: $X_{\text{cam}} = \text{lerp}(X_{\text{cam}}, X_{\text{player}}, 0.12)$, $Y_{\text{cam}} = Y_{\text{player}} + 3.2\text{m}$, $Z_{\text{cam}} = Z_{\text{player}} + 6.5\text{m}$.
- LookAt: Target point ahead at $(X_{\text{player}} \cdot 0.5, Y_{\text{player}} + 1.2\text{m}, Z_{\text{player}} - 8.0\text{m})$.
- Camera Shake: Triggered on landing and stumbles using dampened high-frequency perlin noise offsets.
