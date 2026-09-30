# ThreeUI Kage source provenance

M3 uses the registered Kage source as a visual and motion reference, not as page content.

- Package: `@designcodeio/threeui@1.2.0`
- Registered Kage HTML SHA-256: `c8e06b90397ac246baf0ab6f32f5f6b570acc6fe03c7009f711b579fb72d9f49`
- Registered fonts SHA-256: `985f85a904a4096f92c06552b06f42a45973ac004af4780d68f18af65ddcc1b0`
- Registered Three.js SHA-256: `8a5f7249903b54d30f79f708699d2fed2d6a1d0741a4cd41377d1f01bb5a2271`
- Embedded `LandingPages.tsx`: `4d379461ad00eb4de7900df312878035383de7e1ed4e13283b8143a2eea9d30a`
- Embedded `pageTypography.ts`: `809cc65797d531cd3b3ca5a56815d55d24b3ee8d293e4e4bad6fdfe6c83244cc`
- Embedded `pageRecipes.ts`: `c9d9849cc255bac2d1d938d088c50917f84916f1c516d2bbb27fcfd803523233`
- Embedded `LandingPageFrame.tsx`: `61de2cc50888aac4ac5557420b07fa47ed3543bb57c1e0055fafdefa53dbaa78`
- Embedded `threeui.css`: `efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf`

All registered source files and 14 packaged Kage binary images were inspected and hash-verified. The current live Kage page differs from the registered revision, so the package artifact is the source of truth. Temple, shrine, foliage, and other original subject imagery is intentionally not shipped because it conflicts with the ImmXrsive subject direction. The verified font and Three.js runtime are copied byte-for-byte into `public/threeui`.

Preserved architecture: a full-viewport WebGL scene behind semantic DOM, seeded depth field, pointer/camera damping, scroll-linked camera progress, IntersectionObserver reveals, layered foreground treatment, adaptive pixel ratio, reduced-motion behavior, visibility/intersection pausing, and explicit resource cleanup. The scene composition and all public-facing copy are original to ImmXrsive.
