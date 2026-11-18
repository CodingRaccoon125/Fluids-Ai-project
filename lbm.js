/* D2Q9 lattice Boltzmann (BGK) solver for flow past a circular cylinder.
   Inlet: equilibrium at speed U. Outlet: zero-gradient. Top/bottom: periodic.
   Cylinder: half-way bounce-back (no-slip). Units: lattice units, Re = U*D/nu. */
class LBM {
  constructor(nx = 400, ny = 160, D = 20, U = 0.12) {
    this.nx = nx; this.ny = ny; this.D = D; this.U = U;
    const N = nx * ny; this.N = N;
    this.ex = [0, 1, 0, -1, 0, 1, -1, -1, 1];
    this.ey = [0, 0, 1, 0, -1, 1, 1, -1, -1];
    this.w = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];
    this.opp = [0, 3, 4, 1, 2, 7, 8, 5, 6];
    this.f = new Float32Array(9 * N); this.g = new Float32Array(9 * N);
    this.rho = new Float32Array(N); this.ux = new Float32Array(N); this.uy = new Float32Array(N);
    this.solid = new Uint8Array(N);
    this.cx = Math.round(nx / 5); this.cy = ny / 2 + 0.5;
    const r = D / 2;
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++)
      if ((x - this.cx) ** 2 + (y - this.cy) ** 2 <= r * r) this.solid[x + y * nx] = 1;
    this.setRe(100); this.reset();
  }
  setRe(Re) { this.Re = Re; this.tau = 0.5 + 3 * this.U * this.D / Re; this.omega = 1 / this.tau; }
  feq(k, rho, u, v) {
    const eu = this.ex[k] * u + this.ey[k] * v, uu = u * u + v * v;
    return this.w[k] * rho * (1 + 3 * eu + 4.5 * eu * eu - 1.5 * uu);
  }
  reset() {
    const { nx, ny, N, f } = this;
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const i = x + y * nx, v = 0.02 * this.U * Math.sin(2 * Math.PI * x / nx * 3); // seed asymmetry
      for (let k = 0; k < 9; k++) f[k * N + i] = this.feq(k, 1, this.U, v);
    }
    this.t = 0; this.ok = true;
  }
  step() {
    const { nx, ny, N, ex, ey, w, opp, solid, omega, rho, ux, uy } = this;
    let f = this.f, g = this.g;
    // collide (in place)
    for (let i = 0; i < N; i++) {
      if (solid[i]) { rho[i] = 1; ux[i] = uy[i] = 0; continue; }
      let r = 0, u = 0, v = 0;
      for (let k = 0; k < 9; k++) { const q = f[k * N + i]; r += q; u += q * ex[k]; v += q * ey[k]; }
      u /= r; v /= r; rho[i] = r; ux[i] = u; uy[i] = v;
      const uu = 1.5 * (u * u + v * v);
      for (let k = 0; k < 9; k++) {
        const eu = ex[k] * u + ey[k] * v, e = w[k] * r * (1 + 3 * eu + 4.5 * eu * eu - uu);
        f[k * N + i] += omega * (e - f[k * N + i]);
      }
    }
    // stream (pull) with bounce-back and periodic y
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const i = x + y * nx; if (solid[i]) continue;
      for (let k = 0; k < 9; k++) {
        let sx = x - ex[k]; const sy = (y - ey[k] + ny) % ny;
        if (sx < 0) sx = 0; else if (sx >= nx) sx = nx - 1;
        const s = sx + sy * nx;
        g[k * N + i] = solid[s] ? f[opp[k] * N + i] : f[k * N + s];
      }
    }
    // inlet (equilibrium) and outlet (copy)
    for (let y = 0; y < ny; y++) for (let k = 0; k < 9; k++) {
      g[k * N + y * nx] = this.feq(k, 1, this.U, 0);
      g[k * N + nx - 1 + y * nx] = g[k * N + nx - 2 + y * nx];
    }
    this.f = g; this.g = f; this.t++;
    const p = rho[(this.cx + 3 * this.D) + (ny >> 1) * nx];
    if (!(p > 0.5 && p < 1.5)) this.ok = false; // blow-up guard
  }
  vorticity(i) { const nx = this.nx, u = this.uy, v = this.ux;
    return (u[i + 1] - u[i - 1]) * 0.5 - (v[i + nx] - v[i - nx]) * 0.5; }
}
if (typeof module !== 'undefined') module.exports = LBM;
