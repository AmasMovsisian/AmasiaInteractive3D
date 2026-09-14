# AMASIA

### Interactive 3D Luxury Energy Experience

<img src="docs/screenshots/hero.gif" width="100%" alt="AMASIA Hero" />

## A Full Stack Production

AMASIA is a fully self produced digital experience for a premium energy drink brand, built from the first concept sketch to the final line of TypeScript and the last line of Python.

Every part of the project was developed as one continuous workflow: **brand identity, UI/UX, 3D modeling, PBR texturing, animation, rendering, frontend architecture, WebGL performance optimization, backend API design, and deployment.**

The result is an immersive 3D product experience built with **Angular 20 and Three.js**, powered by a **Django REST Framework** backend with JWT authentication, a complete cart and checkout pipeline, and a simulated delivery system.

---

## Explore the Project

<table>
  <tr>
    <td align="center" width="50%">
      <a href="https://github.com/AmasMovsisian/AmasiaInteractive3D/tree/main/frontend">
        <img src="https://skillicons.dev/icons?i=angular,threejs,ts" alt="Frontend Stack" />
      </a>
      <br /><br />
      <a href="https://github.com/AmasMovsisian/AmasiaInteractive3D/tree/main/frontend"><b>Frontend</b></a>
      <br />
      <sub>Angular 20, Three.js, KTX2, custom 3D pipeline</sub>
    </td>
    <td align="center" width="50%">
      <a href="https://github.com/AmasMovsisian/AmasiaInteractive3D/tree/main/backend">
        <img src="https://skillicons.dev/icons?i=django,python,linux" alt="Backend Stack" />
      </a>
      <br /><br />
      <a href="https://github.com/AmasMovsisian/AmasiaInteractive3D/tree/main/backend"><b>Backend</b></a>
      <br />
      <sub>Django REST, JWT, cart, checkout, orders</sub>
    </td>
  </tr>
</table>

---

## Highlights

- **Immersive 3D Interaction:** Interactive cans with fluid 360° rotation, dynamic flavor switching, and cinematic camera transitions.
- **Ultra Fast Loading:** High fidelity textures optimized from **113 MB+ down to 5.67 MB** using **KTX2/Basis Universal** compression.
- **Custom Branding & UI/UX:** A minimalist luxury aesthetic with seamless Dark and Light mode and custom typography (Orbitron, Exo 2, League Spartan).
- **Full Stack Integration:** Registration, login, cart, checkout, order history, and account management connected through a live Django REST API with JWT authentication.
- **Complete Order Pipeline:** Individual cans, discounted packs, pack composition rules, cart limits, and a simulated delivery status after three days.
- **Production Deployment:** Backend deployed on an Ubuntu Linux server with Nginx and Gunicorn. Frontend hosted on GitHub Pages.

---

## Tech Stack

**Frontend**

- Angular 20 (TypeScript, SCSS)
- Three.js (WebGL, GLTFLoader, KTX2Loader, EXRLoader)
- Custom Angular Services for state, auth, and orders
- KTX2 and Basis Universal compression
- Hosted on GitHub Pages

**Backend**

- Django and Django REST Framework
- SimpleJWT with token rotation and blacklist
- SQLite for development
- Nginx and Gunicorn for production
- Deployed on an Ubuntu Linux server

---

## Design and 3D Pipeline

Every visual asset in AMASIA was produced from the ground up.

- **Autodesk Maya:** High fidelity 3D modeling of the cans and animation.
- **Adobe Substance Painter:** PBR texturing with Base Color, Metallic, and Roughness maps.
- **Adobe Photoshop:** Custom label design, UI layout, and final post processing.
- **Houdini:** GLB export for Three.js, and Redshift rendering for the upcoming flavors and shop.

---

## About the Creator

This project is a **solo production** from start to finish. It demonstrates that design, art, and code are not separate disciplines, but parts of a single workflow.

Built for the portfolio to showcase a complete end to end production, from 3D modeling and high end texturing, to frontend architecture and WebGL performance, to backend API design and production deployment.

### Author

**Amas Movsisian**