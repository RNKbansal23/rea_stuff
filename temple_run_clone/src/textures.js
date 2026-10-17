import * as THREE from 'three';

// Procedural Textures for Connaught Place (CP), New Delhi 3D Map
export class TextureGenerator {
  // Delhi Asphalt Road with white dashed lane markings
  static createDelhiRoadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark asphalt tarmac
    ctx.fillStyle = '#2a2b2e';
    ctx.fillRect(0, 0, 512, 512);

    // Fine asphalt gravel noise
    for (let i = 0; i < 800; i++) {
      const shade = 35 + Math.random() * 20;
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    // White dashed lane dividers (3 lanes = 2 divider lines)
    ctx.fillStyle = '#f0f0f0';
    const lane1 = 512 * 0.33;
    const lane2 = 512 * 0.67;
    const dashLength = 60;
    const gapLength = 40;

    for (let y = 0; y < 512; y += dashLength + gapLength) {
      ctx.fillRect(lane1 - 4, y, 8, dashLength);
      ctx.fillRect(lane2 - 4, y, 8, dashLength);
    }

    // Outer solid white road edge lines
    ctx.fillRect(14, 0, 8, 512);
    ctx.fillRect(490, 0, 8, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);
    return texture;
  }

  // Delhi Yellow and Black Striped Kerb / Curb
  static createYellowBlackCurbTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const stripes = 8;
    const stripeW = 256 / stripes;

    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = (i % 2 === 0) ? '#ffcc00' : '#1c1c1c';
      ctx.fillRect(i * stripeW, 0, stripeW, 64);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 1);
    return texture;
  }

  // Connaught Place White Colonial Georgian Arcade & Pillars Facade
  static createCPColonialFacadeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Crisp heritage cream/white plaster
    ctx.fillStyle = '#f4f2ea';
    ctx.fillRect(0, 0, 512, 512);

    // Upper floor classical Georgian shutter windows with cornices
    const winW = 50;
    const winH = 90;
    for (let i = 0; i < 4; i++) {
      const wx = 35 + i * 125;
      const wy = 45;

      // Triangular Pediment
      ctx.fillStyle = '#dfdcd0';
      ctx.beginPath();
      ctx.moveTo(wx + winW / 2, wy - 20);
      ctx.lineTo(wx - 8, wy);
      ctx.lineTo(wx + winW + 8, wy);
      ctx.fill();

      // Window Frame & Glass
      ctx.fillStyle = '#26333a';
      ctx.fillRect(wx, wy, winW, winH);
      ctx.strokeStyle = '#e8e5d8';
      ctx.lineWidth = 3;
      ctx.strokeRect(wx, wy, winW, winH);

      // Window Panes
      ctx.beginPath();
      ctx.moveTo(wx + winW / 2, wy);
      ctx.lineTo(wx + winW / 2, wy + winH);
      ctx.moveTo(wx, wy + winH / 2);
      ctx.lineTo(wx + winW, wy + winH / 2);
      ctx.stroke();
    }

    // Mid cornice division moulding
    ctx.fillStyle = '#e2dfd4';
    ctx.fillRect(0, 185, 512, 18);
    ctx.fillStyle = '#c5c2b5';
    ctx.fillRect(0, 203, 512, 6);

    // Ground Floor: Famous Connaught Place Shop Signboards
    const shops = [
      { name: "WENGER'S DELI", bg: '#800020', text: '#ffd700' },
      { name: 'KEVENTERS 1925', bg: '#0b3c5d', text: '#ffffff' },
      { name: 'JANPATH BAZAAR', bg: '#1d2731', text: '#f9a825' },
      { name: 'FABINDIA', bg: '#4a154b', text: '#ffffff' }
    ];

    shops.forEach((shop, idx) => {
      const sx = 20 + idx * 125;
      const sy = 220;

      // Signboard
      ctx.fillStyle = shop.bg;
      ctx.fillRect(sx, sy, 105, 36);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, 105, 36);

      ctx.fillStyle = shop.text;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(shop.name, sx + 52, sy + 22);

      // Shop Showcase Glass
      ctx.fillStyle = '#1c2833';
      ctx.fillRect(sx, sy + 44, 105, 115);
      ctx.strokeStyle = '#e0ded3';
      ctx.strokeRect(sx, sy + 44, 105, 115);
    });

    // Ground Arcade Pillars
    ctx.fillStyle = '#edeae0';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(i * 125, 210, 16, 180);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // Delhi Police Yellow Metal Barricade Texture
  static createDelhiBarricadeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Bright Delhi Police Yellow
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(0, 0, 256, 128);

    // Blue & Red Center Band
    ctx.fillStyle = '#0d2c54';
    ctx.fillRect(0, 38, 256, 52);

    ctx.fillStyle = '#c70039';
    ctx.fillRect(0, 48, 256, 32);

    // "DELHI POLICE" Bold White Text
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 18px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DELHI POLICE', 128, 71);

    // Diagonal Hazard Chevrons on top and bottom borders
    ctx.fillStyle = '#000000';
    for (let x = -30; x < 280; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 14, 0);
      ctx.lineTo(x + 2, 22);
      ctx.lineTo(x - 12, 22);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x, 106);
      ctx.lineTo(x + 14, 106);
      ctx.lineTo(x + 2, 128);
      ctx.lineTo(x - 12, 128);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  // Auto-Rickshaw Green & Yellow Livery Texture
  static createAutoRickshawTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Upper Yellow Hood
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(0, 0, 256, 120);

    // Lower Green Body (Delhi CNG green)
    ctx.fillStyle = '#1e7b34';
    ctx.fillRect(0, 120, 256, 136);

    // Windshield & Black Trim
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(30, 20, 196, 75);
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(36, 26, 184, 63);

    // Headlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(128, 150, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }

  // Indian Rupee (₹) Golden Coin
  static createRupeeCoinTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 58);
    grad.addColorStop(0, '#fff37a');
    grad.addColorStop(0.6, '#ffcc00');
    grad.addColorStop(1, '#b8860b');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 4;
    ctx.stroke();

    // ₹ Symbol
    ctx.fillStyle = '#6b4d00';
    ctx.font = 'bold 54px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('₹', 64, 68);

    return new THREE.CanvasTexture(canvas);
  }

  // Statesman House / Modern CP Red-Brick Tower Facade
  static createModernCPTowerTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Terracotta red brick
    ctx.fillStyle = '#8f3e26';
    ctx.fillRect(0, 0, 256, 512);

    // Glass curtain windows grid
    ctx.fillStyle = '#1e384d';
    for (let y = 10; y < 500; y += 35) {
      for (let x = 12; x < 240; x += 32) {
        ctx.fillRect(x, y, 22, 24);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }
}
