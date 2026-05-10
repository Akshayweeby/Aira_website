/**
 * three-scene.js — Three.js 3D Hero Scene
 * Glassmorphism orb with particles, mouse parallax, dynamic lighting
 * Only loaded on homepage for performance
 */

(function () {
  'use strict';

  // Check if Three.js is available and canvas exists
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  // Detect low-end devices
  const isLowEnd = /Mobi|Android/i.test(navigator.userAgent) ||
    window.innerWidth < 768 ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);

  if (isLowEnd) {
    canvas.style.display = 'none';
    return;
  }

  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  // ---------- GLASSMORPHISM ORB ----------
  const orbGeometry = new THREE.IcosahedronGeometry(1.5, 4);
  const orbMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x2e7d32,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.9,
    thickness: 1.5,
    ior: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.0,
    transparent: true,
    opacity: 0.7,
  });
  const orb = new THREE.Mesh(orbGeometry, orbMaterial);
  scene.add(orb);

  // Inner wireframe for visual depth
  const wireGeometry = new THREE.IcosahedronGeometry(1.2, 2);
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0xfdd835,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
  });
  const wireOrb = new THREE.Mesh(wireGeometry, wireMaterial);
  scene.add(wireOrb);

  // ---------- PARTICLES ----------
  const particleCount = 300;
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 20;
    positions[i + 1] = (Math.random() - 0.5) * 20;
    positions[i + 2] = (Math.random() - 0.5) * 15;
    velocities[i] = (Math.random() - 0.5) * 0.005;
    velocities[i + 1] = (Math.random() - 0.5) * 0.005;
    velocities[i + 2] = (Math.random() - 0.5) * 0.005;
  }

  particleGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  );

  const particleMaterial = new THREE.PointsMaterial({
    color: 0x2e7d32, // Dark green for light background
    size: 0.06,
    transparent: true,
    opacity: 0.5,
    blending: THREE.NormalBlending,
    depthWrite: false,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // ---------- LIGHTING ----------
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Brighter ambient
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0x2e7d32, 2.5, 20); // Green light
  pointLight1.position.set(3, 3, 3);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0xfdd835, 2, 20); // Yellow light
  pointLight2.position.set(-3, -2, 4);
  scene.add(pointLight2);

  const pointLight3 = new THREE.PointLight(0xffffff, 1.5, 15); // White rim light
  pointLight3.position.set(0, 4, -3);
  scene.add(pointLight3);

  // ---------- MOUSE INTERACTION ----------
  let targetRotX = 0,
    targetRotY = 0;
  let currentRotX = 0,
    currentRotY = 0;

  document.addEventListener('mousemove', (e) => {
    targetRotX = (e.clientY / window.innerHeight - 0.5) * 0.5;
    targetRotY = (e.clientX / window.innerWidth - 0.5) * 0.5;
  });

  // ---------- ANIMATION LOOP ----------
  let time = 0;

  function animate() {
    requestAnimationFrame(animate);
    time += 0.005;

    // Smooth mouse follow
    currentRotX += (targetRotX - currentRotX) * 0.05;
    currentRotY += (targetRotY - currentRotY) * 0.05;

    // Orb rotation
    orb.rotation.x = currentRotX + time * 0.3;
    orb.rotation.y = currentRotY + time * 0.5;

    // Wire orb counter-rotation
    wireOrb.rotation.x = -currentRotX - time * 0.2;
    wireOrb.rotation.y = -currentRotY - time * 0.3;

    // Orb scale breathing
    const breathe = 1 + Math.sin(time * 2) * 0.03;
    orb.scale.set(breathe, breathe, breathe);

    // Animate particles
    const posArray = particleGeometry.attributes.position.array;
    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i] += velocities[i];
      posArray[i + 1] += velocities[i + 1];
      posArray[i + 2] += velocities[i + 2];

      // Wrap around
      if (Math.abs(posArray[i]) > 10) velocities[i] *= -1;
      if (Math.abs(posArray[i + 1]) > 10) velocities[i + 1] *= -1;
      if (Math.abs(posArray[i + 2]) > 7.5) velocities[i + 2] *= -1;
    }
    particleGeometry.attributes.position.needsUpdate = true;

    // Animate lights
    pointLight1.position.x = Math.sin(time * 0.7) * 4;
    pointLight1.position.y = Math.cos(time * 0.5) * 4;
    pointLight2.position.x = Math.cos(time * 0.6) * 4;
    pointLight2.position.y = Math.sin(time * 0.8) * 3;

    renderer.render(scene, camera);
  }
  animate();

  // ---------- RESIZE HANDLING ----------
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }, 200);
  });

  // ---------- CLEANUP ----------
  window.addEventListener('beforeunload', () => {
    renderer.dispose();
    orbGeometry.dispose();
    orbMaterial.dispose();
    wireGeometry.dispose();
    wireMaterial.dispose();
    particleGeometry.dispose();
    particleMaterial.dispose();
  });
})();
