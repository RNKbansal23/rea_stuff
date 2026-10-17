import * as THREE from 'three';
import { gameAudio } from './audio.js';
import { TextureGenerator } from './textures.js';

export class TempleRunGame {
  constructor(canvasContainer) {
    this.container = canvasContainer;

    // Game State
    this.isRunning = false;
    this.isGameOver = false;
    this.score = 0;
    this.coins = 0; // Rupee coins
    this.distance = 0;
    this.speed = 20.0; // base running speed (m/s)
    this.maxSpeed = 40.0;

    // 3 Lanes (-1 = Left, 0 = Center, 1 = Right)
    this.currentLane = 0;
    this.targetX = 0;
    this.playerX = 0;
    this.laneWidth = 2.6;

    // Jump & Slide Physics
    this.playerY = 0;
    this.velocityY = 0;
    this.gravity = -36.0;
    this.isJumping = false;

    this.isSliding = false;
    this.slideTimer = 0;
    this.slideDuration = 0.85;

    // Chaser: Delhi Traffic Police Officer
    this.copDistance = 7.5;
    this.copTargetDist = 7.5;
    this.isStumbling = false;
    this.stumbleCount = 0;

    // Road Track Segments
    this.trackSegments = [];
    this.segmentLength = 36;
    this.visibleSegments = 8;
    this.nextSpawnZ = 0;

    // Active Entities
    this.activeCoins = [];
    this.activeObstacles = [];

    // Clocks
    this.clock = new THREE.Clock();
    this.runAnimTime = 0;
    this.cameraShake = 0;

    this.initThree();
    this.buildCharacter();
    this.buildTrafficCop();
    this.setupInputs();
    this.resetGame();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  /* ==========================================================================
     THREE.JS SCENE SETUP — CONNAUGHT PLACE (NEW DELHI)
     ========================================================================== */

  initThree() {
    this.scene = new THREE.Scene();

    // Sunny Delhi daylight sky with warm urban haze
    const skyColor = new THREE.Color(0xbddae6);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0xbddae6, 0.012);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(64, aspect, 0.1, 400);
    this.camera.position.set(0, 3.8, 7.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Warm Northern India Daylight
    const ambientLight = new THREE.AmbientLight(0xfff6e8, 0.7);
    this.scene.add(ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1dc, 1.35);
    this.sunLight.position.set(30, 50, 20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 140;
    this.sunLight.shadow.camera.left = -25;
    this.sunLight.shadow.camera.right = 25;
    this.sunLight.shadow.camera.top = 30;
    this.sunLight.shadow.camera.bottom = -15;
    this.scene.add(this.sunLight);

    // Reusable Materials
    this.materials = {
      delhiRoad: new THREE.MeshStandardMaterial({
        map: TextureGenerator.createDelhiRoadTexture(),
        roughness: 0.85,
        metalness: 0.1
      }),
      stripedCurb: new THREE.MeshStandardMaterial({
        map: TextureGenerator.createYellowBlackCurbTexture(),
        roughness: 0.7
      }),
      cpColonial: new THREE.MeshStandardMaterial({
        map: TextureGenerator.createCPColonialFacadeTexture(),
        roughness: 0.8
      }),
      modernTower: new THREE.MeshStandardMaterial({
        map: TextureGenerator.createModernCPTowerTexture(),
        roughness: 0.5,
        metalness: 0.2
      }),
      sidewalk: new THREE.MeshStandardMaterial({
        color: 0xdfd9ce,
        roughness: 0.9
      }),
      redSandstoneRailing: new THREE.MeshStandardMaterial({
        color: 0x9e3f28, // Red sandstone
        roughness: 0.85
      }),
      greenTree: new THREE.MeshStandardMaterial({
        color: 0x245a27,
        roughness: 0.9
      }),
      treeTrunk: new THREE.MeshStandardMaterial({
        color: 0x4a321e,
        roughness: 0.95
      }),
      barricade: new THREE.MeshStandardMaterial({
        map: TextureGenerator.createDelhiBarricadeTexture(),
        roughness: 0.5,
        metalness: 0.4
      }),
      autoRickshaw: new THREE.MeshStandardMaterial({
        map: TextureGenerator.createAutoRickshawTexture(),
        roughness: 0.4,
        metalness: 0.3
      }),
      rupeeCoin: new THREE.MeshStandardMaterial({
        map: TextureGenerator.createRupeeCoinTexture(),
        roughness: 0.2,
        metalness: 0.85,
        emissive: 0xaa8800,
        emissiveIntensity: 0.5
      }),
      trafficGreen: new THREE.MeshBasicMaterial({ color: 0x00ff66 }),
      trafficRed: new THREE.MeshBasicMaterial({ color: 0xff1122 }),
      whiteColumn: new THREE.MeshStandardMaterial({ color: 0xf5f3ea, roughness: 0.7 })
    };

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /* ==========================================================================
     RUNNER CHARACTER MODEL
     ========================================================================== */

  buildCharacter() {
    this.playerGroup = new THREE.Group();

    // Torso: Casual stylish jacket and shirt
    const torsoGeo = new THREE.BoxGeometry(0.72, 0.88, 0.44);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x224466, roughness: 0.7 }); // Navy jacket
    this.torso = new THREE.Mesh(torsoGeo, torsoMat);
    this.torso.position.y = 1.15;
    this.torso.castShadow = true;
    this.playerGroup.add(this.torso);

    // Inner White T-Shirt
    const shirtGeo = new THREE.BoxGeometry(0.36, 0.72, 0.46);
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xfcfcfc, roughness: 0.6 });
    const shirt = new THREE.Mesh(shirtGeo, shirtMat);
    shirt.position.y = 0.04;
    this.torso.add(shirt);

    // Head
    const headGeo = new THREE.BoxGeometry(0.38, 0.42, 0.38);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xdfb08c, roughness: 0.5 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.set(0, 0.65, 0);
    this.head.castShadow = true;
    this.torso.add(this.head);

    // Modern Black Hair
    const hairGeo = new THREE.BoxGeometry(0.42, 0.18, 0.42);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.9 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.22;
    this.head.add(hair);

    // Limbs - Arms
    const armMat = new THREE.MeshStandardMaterial({ color: 0xdfb08c, roughness: 0.5 });
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x224466, roughness: 0.7 });

    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.48, 0.32, 0);
    const leftSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.22), sleeveMat);
    leftSleeve.position.y = -0.1;
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), armMat);
    leftArm.position.y = -0.42;
    leftArm.castShadow = true;
    this.leftArmPivot.add(leftSleeve);
    this.leftArmPivot.add(leftArm);
    this.torso.add(this.leftArmPivot);

    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.48, 0.32, 0);
    const rightSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.22), sleeveMat);
    rightSleeve.position.y = -0.1;
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), armMat);
    rightArm.position.y = -0.42;
    rightArm.castShadow = true;
    this.rightArmPivot.add(rightSleeve);
    this.rightArmPivot.add(rightArm);
    this.torso.add(this.rightArmPivot);

    // Denim Jeans & Sneakers
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x28323e, roughness: 0.8 });
    const sneakerMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });

    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.2, -0.44, 0);
    const leftPants = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.24), pantsMat);
    leftPants.position.y = -0.25;
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.36), sneakerMat);
    leftShoe.position.set(0, -0.6, 0.05);
    leftPants.castShadow = true;
    leftShoe.castShadow = true;
    this.leftLegPivot.add(leftPants);
    this.leftLegPivot.add(leftShoe);
    this.torso.add(this.leftLegPivot);

    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.2, -0.44, 0);
    const rightPants = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.24), pantsMat);
    rightPants.position.y = -0.25;
    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.36), sneakerMat);
    rightShoe.position.set(0, -0.6, 0.05);
    rightPants.castShadow = true;
    rightShoe.castShadow = true;
    this.rightLegPivot.add(rightPants);
    this.rightLegPivot.add(rightShoe);
    this.torso.add(this.rightLegPivot);

    this.scene.add(this.playerGroup);
  }

  /* ==========================================================================
     CHASER: DELHI TRAFFIC POLICE OFFICER
     ========================================================================== */

  buildTrafficCop() {
    this.copGroup = new THREE.Group();

    // Khaki Police Uniform Torso
    const copTorsoGeo = new THREE.BoxGeometry(0.74, 0.9, 0.46);
    const khakiMat = new THREE.MeshStandardMaterial({ color: 0xc4a470, roughness: 0.75 });
    const copTorso = new THREE.Mesh(copTorsoGeo, khakiMat);
    copTorso.position.y = 1.15;
    copTorso.castShadow = true;
    this.copGroup.add(copTorso);

    // Leather Police Belt & Whistle lanyard
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.14, 0.48), new THREE.MeshStandardMaterial({ color: 0x331c0a }));
    belt.position.y = -0.36;
    copTorso.add(belt);

    // Head with Delhi Police White Peak Cap
    const copHead = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.4, 0.38), new THREE.MeshStandardMaterial({ color: 0xd6a47a }));
    copHead.position.set(0, 0.65, 0);
    copTorso.add(copHead);

    // White Police Cap with Red/Blue badge
    const capBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.16, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    capBase.position.y = 0.22;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.18), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    visor.position.set(0, -0.06, -0.18);
    capBase.add(visor);
    copHead.add(capBase);

    // Police Arms
    this.copLeftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), khakiMat);
    this.copLeftArm.position.set(-0.48, 0, 0);
    copTorso.add(this.copLeftArm);

    this.copRightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), khakiMat);
    this.copRightArm.position.set(0.48, 0, 0);
    copTorso.add(this.copRightArm);

    this.scene.add(this.copGroup);
  }

  /* ==========================================================================
     CONNAUGHT PLACE 3D MAP GENERATION
     ========================================================================== */

  spawnTrackSegment(zPos) {
    const segment = new THREE.Group();
    segment.position.z = zPos;

    const roadWidth = 9.2; // 3 Full Road Lanes

    // 1. MAIN CONNAUGHT CIRCLE ROAD TARMAC
    const roadGeo = new THREE.BoxGeometry(roadWidth, 0.6, this.segmentLength);
    const road = new THREE.Mesh(roadGeo, this.materials.delhiRoad);
    road.position.y = -0.3;
    road.receiveShadow = true;
    segment.add(road);

    // 2. YELLOW & BLACK STRIPED CURBS
    const curbGeo = new THREE.BoxGeometry(0.4, 0.4, this.segmentLength);
    const leftCurb = new THREE.Mesh(curbGeo, this.materials.stripedCurb);
    leftCurb.position.set(-roadWidth / 2 - 0.2, 0.1, 0);
    segment.add(leftCurb);

    const rightCurb = new THREE.Mesh(curbGeo, this.materials.stripedCurb);
    rightCurb.position.set(roadWidth / 2 + 0.2, 0.1, 0);
    segment.add(rightCurb);

    // 3. INNER SIDE: ICONIC WHITE GEORGIAN COLONNADES & SHOPS (Wenger's, Keventers, Janpath)
    const facadeGeo = new THREE.BoxGeometry(0.8, 12.0, this.segmentLength);
    const leftBuilding = new THREE.Mesh(facadeGeo, this.materials.cpColonial);
    leftBuilding.position.set(-roadWidth / 2 - 4.5, 5.8, 0);
    leftBuilding.castShadow = true;
    leftBuilding.receiveShadow = true;
    segment.add(leftBuilding);

    // Continuous Classical White Circular Pillars lining the colonnade walkway
    const pillarGeo = new THREE.CylinderGeometry(0.28, 0.32, 5.5, 16);
    [-12, 0, 12].forEach(pz => {
      const col = new THREE.Mesh(pillarGeo, this.materials.whiteColumn);
      col.position.set(-roadWidth / 2 - 1.5, 2.75, pz);
      col.castShadow = true;
      segment.add(col);
    });

    // Pedestrian Pavement / Sidewalk
    const sidewalkGeo = new THREE.BoxGeometry(3.6, 0.35, this.segmentLength);
    const leftSidewalk = new THREE.Mesh(sidewalkGeo, this.materials.sidewalk);
    leftSidewalk.position.set(-roadWidth / 2 - 2.0, -0.15, 0);
    leftSidewalk.receiveShadow = true;
    segment.add(leftSidewalk);

    // Red Sandstone Jali Railing along sidewalk
    const railingGeo = new THREE.BoxGeometry(0.12, 0.9, this.segmentLength);
    const leftRailing = new THREE.Mesh(railingGeo, this.materials.redSandstoneRailing);
    leftRailing.position.set(-roadWidth / 2 - 0.4, 0.45, 0);
    segment.add(leftRailing);

    // 4. OUTER SIDE: CENTRAL PARK GREEN LAWNS, TREES & MODERN TOWERS (Statesman House)
    const rightSidewalk = new THREE.Mesh(sidewalkGeo, this.materials.sidewalk);
    rightSidewalk.position.set(roadWidth / 2 + 2.0, -0.15, 0);
    rightSidewalk.receiveShadow = true;
    segment.add(rightSidewalk);

    const rightRailing = new THREE.Mesh(railingGeo, this.materials.redSandstoneRailing);
    rightRailing.position.set(roadWidth / 2 + 0.4, 0.45, 0);
    segment.add(rightRailing);

    // Neem / Peepal Trees along Central Park border
    [-10, 10].forEach(tz => {
      const tree = this.createDelhiTree();
      tree.position.set(roadWidth / 2 + 3.2, 0, tz);
      segment.add(tree);
    });

    // Modern CP High-rise (Statesman House / LIC building in background)
    const towerGeo = new THREE.BoxGeometry(10.0, 24.0, this.segmentLength * 0.8);
    const tower = new THREE.Mesh(towerGeo, this.materials.modernTower);
    tower.position.set(roadWidth / 2 + 14.0, 11.0, 0);
    tower.castShadow = true;
    segment.add(tower);

    // 5. DELHI STREETLIGHTS & OVERHEAD ROAD SIGNS
    const lightPole = this.createDelhiStreetlight();
    lightPole.position.set(-roadWidth / 2 - 0.3, 0, 0);
    segment.add(lightPole);

    // 6. POPULATE DELHI HURDLES & RUPEE COINS
    if (zPos < -35) {
      this.populateSegmentContents(segment, zPos);
    }

    this.scene.add(segment);
    this.trackSegments.push(segment);
  }

  createDelhiTree() {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3.2, 8), this.materials.treeTrunk);
    trunk.position.y = 1.6;
    trunk.castShadow = true;
    tree.add(trunk);

    const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4, 1), this.materials.greenTree);
    foliage.position.y = 4.2;
    foliage.castShadow = true;
    tree.add(foliage);
    return tree;
  }

  createDelhiStreetlight() {
    const poleGroup = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6.0, 8), new THREE.MeshStandardMaterial({ color: 0x444444 }));
    pole.position.y = 3.0;
    poleGroup.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: 0x444444 }));
    arm.position.set(0.9, 5.8, 0);
    arm.rotation.z = -0.2;
    poleGroup.add(arm);

    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.25), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    lamp.position.set(1.7, 5.6, 0);
    poleGroup.add(lamp);
    return poleGroup;
  }

  populateSegmentContents(segment, baseZ) {
    const rand = Math.random();

    // 1. DELHI ROAD HURDLES
    if (rand < 0.35) {
      // Delhi Police Yellow Metal Barricade across a lane (Jump required!)
      const barricade = this.createBarricadeMesh();
      const lane = [-this.laneWidth, 0, this.laneWidth][Math.floor(Math.random() * 3)];
      const zOff = (Math.random() - 0.5) * 12;
      barricade.position.set(lane, 0.65, zOff);
      segment.add(barricade);

      this.activeObstacles.push({
        type: 'jump',
        mesh: barricade,
        worldZ: baseZ + zOff,
        bounds: { minX: lane - 1.2, maxX: lane + 1.2, minY: 0, maxY: 1.15, depth: 1.1 }
      });
    } else if (rand < 0.68) {
      // Green & Yellow CNG Auto-Rickshaw (Tuk-Tuk) in a lane (Dodge or Jump!)
      const auto = this.createAutoRickshawMesh();
      const lane = [-this.laneWidth, 0, this.laneWidth][Math.floor(Math.random() * 3)];
      const zOff = (Math.random() - 0.5) * 12;
      auto.position.set(lane, 0.75, zOff);
      segment.add(auto);

      this.activeObstacles.push({
        type: 'jump',
        mesh: auto,
        worldZ: baseZ + zOff,
        bounds: { minX: lane - 1.2, maxX: lane + 1.2, minY: 0, maxY: 1.35, depth: 1.8 }
      });
    } else if (rand < 0.88) {
      // Overhead Traffic Signal Gantry / Market Awning (Slide under required!)
      const overhead = this.createOverheadGantry();
      const zOff = 0;
      overhead.position.set(0, 0, zOff);
      segment.add(overhead);

      this.activeObstacles.push({
        type: 'slide',
        mesh: overhead,
        worldZ: baseZ + zOff,
        bounds: { minX: -4.5, maxX: 4.5, minY: 0.8, maxY: 3.2, depth: 1.0 }
      });
    }

    // 2. GOLDEN INDIAN RUPEE (₹) COINS
    const coinLane = [-this.laneWidth, 0, this.laneWidth][Math.floor(Math.random() * 3)];
    const coinCount = 5;
    const startZ = -this.segmentLength / 2 + 4;

    for (let i = 0; i < coinCount; i++) {
      const coinMesh = this.createRupeeCoinMesh();
      const zOffset = startZ + i * 2.5;
      coinMesh.position.set(coinLane, 0.9, zOffset);
      segment.add(coinMesh);

      this.activeCoins.push({
        mesh: coinMesh,
        worldZ: baseZ + zOffset,
        collected: false
      });
    }
  }

  createBarricadeMesh() {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.35), this.materials.barricade);
    bar.castShadow = true;
    return bar;
  }

  createAutoRickshawMesh() {
    const auto = new THREE.Group();

    // Body cabin
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.35, 2.2), this.materials.autoRickshaw);
    body.position.y = 0.3;
    body.castShadow = true;
    auto.add(body);

    // Black wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12);

    const fWheel = new THREE.Mesh(wheelGeo, wheelMat);
    fWheel.rotation.z = Math.PI / 2;
    fWheel.position.set(0, -0.4, -0.9);
    auto.add(fWheel);

    const rlWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rlWheel.rotation.z = Math.PI / 2;
    rlWheel.position.set(-0.85, -0.4, 0.7);
    auto.add(rlWheel);

    const rrWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rrWheel.rotation.z = Math.PI / 2;
    rrWheel.position.set(0.85, -0.4, 0.7);
    auto.add(rrWheel);

    return auto;
  }

  createOverheadGantry() {
    const gantry = new THREE.Group();

    // Side metal poles
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.14, 5.0, 8);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x3d4348 });
    const leftP = new THREE.Mesh(poleGeo, metalMat);
    leftP.position.set(-4.6, 2.5, 0);
    const rightP = new THREE.Mesh(poleGeo, metalMat);
    rightP.position.set(4.6, 2.5, 0);
    gantry.add(leftP);
    gantry.add(rightP);

    // Crossbar
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.8, 0.4), metalMat);
    crossbar.position.set(0, 3.2, 0);
    gantry.add(crossbar);

    // Green Delhi Road Sign: "CONNAUGHT PLACE / JANPATH"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 256;
    signCanvas.height = 64;
    const ctx = signCanvas.getContext('2d');
    ctx.fillStyle = '#0f6e3c'; // Delhi green sign
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 248, 56);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CONNAUGHT PLACE (CP)', 128, 28);
    ctx.font = '12px sans-serif';
    ctx.fillText('JANPATH • BARAKHAMBA', 128, 48);

    const signMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) });
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.2, 0.08), signMat);
    signBoard.position.set(0, 2.6, 0.2);
    gantry.add(signBoard);

    // Traffic Lights
    [-2.2, 2.2].forEach(tx => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.25), new THREE.MeshStandardMaterial({ color: 0x111 }));
      box.position.set(tx, 2.6, 0.3);
      const greenL = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), this.materials.trafficGreen);
      greenL.position.set(0, -0.22, 0.14);
      box.add(greenL);
      const redL = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), this.materials.trafficRed);
      redL.position.set(0, 0.22, 0.14);
      box.add(redL);
      gantry.add(box);
    });

    return gantry;
  }

  createRupeeCoinMesh() {
    const geo = new THREE.CylinderGeometry(0.4, 0.4, 0.08, 20);
    const coin = new THREE.Mesh(geo, this.materials.rupeeCoin);
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = true;
    return coin;
  }

  /* ==========================================================================
     INPUT & CONTROLS
     ========================================================================== */

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      gameAudio.init();

      if (this.isGameOver) {
        if (e.code === 'Space') {
          this.resetGame();
          this.startGame();
        }
        return;
      }

      if (!this.isRunning) {
        if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.code)) {
          this.startGame();
        }
      }

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        this.shiftLane(-1);
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        this.shiftLane(1);
      } else if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.jump();
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.slide();
      }
    });

    // Touch Swipes
    let touchStartX = 0;
    let touchStartY = 0;

    window.addEventListener('touchstart', (e) => {
      gameAudio.init();
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
      if (!this.isRunning && !this.isGameOver) {
        this.startGame();
      } else if (this.isGameOver) {
        this.resetGame();
        this.startGame();
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].screenX - touchStartX;
      const dy = e.changedTouches[0].screenY - touchStartY;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 40) this.shiftLane(1);
        else if (dx < -40) this.shiftLane(-1);
      } else {
        if (dy < -40) this.jump();
        else if (dy > 40) this.slide();
      }
    }, { passive: true });
  }

  shiftLane(dir) {
    if (this.currentLane + dir >= -1 && this.currentLane + dir <= 1) {
      this.currentLane += dir;
      this.targetX = this.currentLane * this.laneWidth;
      gameAudio.playFootstep();
    }
  }

  jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.isSliding = false;
      this.velocityY = 13.5;
      gameAudio.playJump();
    }
  }

  slide() {
    if (!this.isSliding) {
      this.isSliding = true;
      this.slideTimer = this.slideDuration;
      if (this.isJumping) {
        this.velocityY = -22.0;
      }
      gameAudio.playSlide();
    }
  }

  /* ==========================================================================
     GAME LIFECYCLE
     ========================================================================== */

  startGame() {
    this.isRunning = true;
    this.isGameOver = false;
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    gameAudio.playPoliceWhistle();
  }

  resetGame() {
    this.isRunning = false;
    this.isGameOver = false;
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.speed = 20.0;
    this.currentLane = 0;
    this.targetX = 0;
    this.playerX = 0;
    this.playerY = 0;
    this.velocityY = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.copDistance = 7.5;
    this.copTargetDist = 7.5;
    this.stumbleCount = 0;

    this.trackSegments.forEach(seg => this.scene.remove(seg));
    this.trackSegments = [];
    this.activeCoins = [];
    this.activeObstacles = [];

    this.playerGroup.position.set(0, 0, 0);
    this.torso.rotation.set(0, 0, 0);

    this.nextSpawnZ = 0;
    for (let i = 0; i < this.visibleSegments; i++) {
      this.spawnTrackSegment(this.nextSpawnZ);
      this.nextSpawnZ -= this.segmentLength;
    }

    this.updateHUD();
  }

  triggerGameOver(cause) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.isRunning = false;
    gameAudio.playDeath();

    const gameOverScreen = document.getElementById('game-over-screen');
    document.getElementById('death-cause').textContent = cause;
    document.getElementById('final-score').textContent = Math.round(this.score);
    document.getElementById('final-distance').textContent = `${Math.round(this.distance)}m`;
    document.getElementById('final-coins').textContent = `₹${this.coins}`;
    gameOverScreen.style.display = 'flex';
  }

  stumble() {
    if (this.isStumbling) return;
    this.isStumbling = true;
    this.stumbleCount++;
    this.cameraShake = 0.45;
    gameAudio.playStumble();
    gameAudio.playPoliceWhistle();

    this.copTargetDist = 2.2; // Police cop surges right behind!

    const warnEl = document.getElementById('stumble-warning');
    warnEl.style.display = 'block';

    if (this.stumbleCount >= 2) {
      this.triggerGameOver('CAUGHT BY DELHI POLICE FOR JAYWALKING!');
      return;
    }

    setTimeout(() => {
      this.isStumbling = false;
      this.copTargetDist = 7.5;
      warnEl.style.display = 'none';
    }, 4500);
  }

  /* ==========================================================================
     PHYSICS LOOP & ANIMATIONS
     ========================================================================== */

  animate() {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.isRunning) {
      this.updatePhysics(delta);
      this.updateWorld(delta);
      this.updateAnimations(delta);
    }

    this.updateCamera(delta);
    this.renderer.render(this.scene, this.camera);
  }

  updatePhysics(delta) {
    // 1. Forward Speed & Distance
    this.speed = Math.min(this.maxSpeed, this.speed + delta * 0.22);
    const forwardDelta = this.speed * delta;
    this.distance += forwardDelta;
    this.score += forwardDelta * 2;
    this.playerGroup.position.z -= forwardDelta;

    // 2. Lateral Lane Interpolation
    this.playerX += (this.targetX - this.playerX) * (1 - Math.exp(-18 * delta));
    this.playerGroup.position.x = this.playerX;

    // 3. Vertical Jump & Gravity
    if (this.isJumping) {
      this.playerY += this.velocityY * delta;
      this.velocityY += this.gravity * delta;

      if (this.playerY <= 0) {
        this.playerY = 0;
        this.velocityY = 0;
        this.isJumping = false;
        gameAudio.playFootstep();
        this.cameraShake = 0.14;
      }
    }
    this.playerGroup.position.y = this.playerY;

    // 4. Slide Duration
    if (this.isSliding) {
      this.slideTimer -= delta;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    // 5. Chasing Traffic Cop Lerp
    this.copDistance += (this.copTargetDist - this.copDistance) * (1 - Math.exp(-4 * delta));
    this.copGroup.position.x = this.playerX;
    this.copGroup.position.y = this.playerY;
    this.copGroup.position.z = this.playerGroup.position.z + this.copDistance;

    // 6. Check Collisions
    this.checkCollisions();

    // 7. Update HUD
    this.updateHUD();
  }

  checkCollisions() {
    const pZ = this.playerGroup.position.z;
    const pX = this.playerGroup.position.x;
    const pY = this.playerGroup.position.y;

    // A. Rupee Coin Collection
    for (let i = this.activeCoins.length - 1; i >= 0; i--) {
      const coin = this.activeCoins[i];
      if (coin.collected) continue;

      const dz = Math.abs(coin.worldZ - pZ);
      const dx = Math.abs(coin.mesh.position.x - pX);
      const dy = Math.abs(coin.mesh.position.y - pY);

      if (dz < 1.4 && dx < 1.2 && dy < 1.8) {
        coin.collected = true;
        coin.mesh.visible = false;
        this.coins += 10; // ₹10 coin
        this.score += 50;
        gameAudio.playCoin();
      }
    }

    // B. Obstacle Collision
    for (let i = 0; i < this.activeObstacles.length; i++) {
      const obs = this.activeObstacles[i];
      const dz = Math.abs(obs.worldZ - pZ);

      if (dz < obs.bounds.depth) {
        if (pX >= obs.bounds.minX && pX <= obs.bounds.maxX) {
          if (obs.type === 'jump') {
            if (pY < obs.bounds.maxY) {
              this.triggerGameOver('CRASHED INTO DELHI POLICE BARRICADE / AUTO!');
              return;
            }
          } else if (obs.type === 'slide') {
            if (!this.isSliding) {
              this.triggerGameOver('HIT THE OVERHEAD CONNAUGHT PLACE SIGNBOARD!');
              return;
            }
          }
        }
      }
    }
  }

  updateWorld(delta) {
    const playerZ = this.playerGroup.position.z;

    // Recycle track segments
    if (this.trackSegments.length > 0) {
      const oldest = this.trackSegments[0];
      if (oldest.position.z > playerZ + this.segmentLength * 1.5) {
        this.scene.remove(oldest);
        this.trackSegments.shift();

        this.spawnTrackSegment(this.nextSpawnZ);
        this.nextSpawnZ -= this.segmentLength;
      }
    }

    // Clean inactive coins/obstacles
    this.activeCoins = this.activeCoins.filter(c => c.worldZ < playerZ + 20);
    this.activeObstacles = this.activeObstacles.filter(o => o.worldZ < playerZ + 20);

    // Spin Rupee Coins
    this.activeCoins.forEach(coin => {
      coin.mesh.rotation.z += 4.5 * delta;
    });

    this.sunLight.position.z = playerZ + 25;
    this.sunLight.target.position.z = playerZ - 10;
  }

  updateAnimations(delta) {
    this.runAnimTime += delta * this.speed * 0.95;

    if (this.isSliding) {
      // Runner slide pose
      this.torso.position.y = 0.42;
      this.torso.rotation.x = 0.85;
      this.leftLegPivot.rotation.x = -1.35;
      this.rightLegPivot.rotation.x = -1.35;
      this.leftArmPivot.rotation.x = 0.9;
      this.rightArmPivot.rotation.x = 0.9;
    } else if (this.isJumping) {
      // Runner leap pose
      this.torso.position.y = 1.15;
      this.torso.rotation.x = -0.2;
      this.leftLegPivot.rotation.x = 0.6;
      this.rightLegPivot.rotation.x = 0.35;
      this.leftArmPivot.rotation.x = -1.3;
      this.rightArmPivot.rotation.x = -1.3;
    } else {
      // Athletic sprint gait
      this.torso.position.y = 1.15 + Math.abs(Math.sin(this.runAnimTime * 2)) * 0.09;
      this.torso.rotation.x = 0.12;

      const legAngle = Math.sin(this.runAnimTime) * 0.95;
      this.leftLegPivot.rotation.x = legAngle;
      this.rightLegPivot.rotation.x = -legAngle;

      const armAngle = Math.sin(this.runAnimTime) * 0.85;
      this.leftArmPivot.rotation.x = -armAngle;
      this.rightArmPivot.rotation.x = armAngle;

      if (Math.sin(this.runAnimTime) > 0.95 || Math.sin(this.runAnimTime) < -0.95) {
        gameAudio.playFootstep();
      }
    }

    // Traffic Police Sprint
    const copGait = Math.sin(this.runAnimTime * 1.1);
    this.copLeftArm.rotation.x = copGait * 0.8;
    this.copRightArm.rotation.x = -copGait * 0.8;
  }

  updateCamera(delta) {
    const pZ = this.playerGroup.position.z;
    const targetCamX = this.playerX * 0.55;
    const targetCamY = this.isSliding ? 2.3 : (3.8 + this.playerY * 0.5);
    const targetCamZ = pZ + 7.5;

    this.camera.position.x += (targetCamX - this.camera.position.x) * (1 - Math.exp(-12 * delta));
    this.camera.position.y += (targetCamY - this.camera.position.y) * (1 - Math.exp(-10 * delta));
    this.camera.position.z = targetCamZ;

    if (this.cameraShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = Math.max(0, this.cameraShake - delta * 1.5);
    }

    const lookTarget = new THREE.Vector3(
      this.playerX * 0.2,
      1.2 + this.playerY * 0.3,
      pZ - 15.0
    );
    this.camera.lookAt(lookTarget);
  }

  updateHUD() {
    document.getElementById('hud-score').textContent = Math.round(this.score);
    document.getElementById('hud-coins').textContent = `₹${this.coins}`;
    document.getElementById('hud-distance').textContent = `${Math.round(this.distance)}m`;
  }
}
