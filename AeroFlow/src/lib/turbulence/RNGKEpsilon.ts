export interface TurbulenceParams {
  C_mu: number;
  C_epsilon1: number;
  C_epsilon2: number;
  C_epsilon3: number;
  sigma_k: number;
  sigma_epsilon: number;
  Pr_t: number;
}

export interface FlowField {
  u: Float32Array;
  v: Float32Array;
  w: Float32Array;
  k: Float32Array;
  epsilon: Float32Array;
  nu_t: Float32Array;
  pressure: Float32Array;
  nx: number;
  ny: number;
  nz: number;
  dx: number;
  dy: number;
  dz: number;
}

export interface Building {
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  surfacePressure?: Float32Array;
}

export const DEFAULT_PARAMS: TurbulenceParams = {
  C_mu: 0.0845,
  C_epsilon1: 1.42,
  C_epsilon2: 1.68,
  C_epsilon3: -0.33,
  sigma_k: 0.72,
  sigma_epsilon: 0.72,
  Pr_t: 0.85
};

export class RNGKEpsilonSolver {
  private params: TurbulenceParams;
  private buildings: Building[] = [];
  
  constructor(params: Partial<TurbulenceParams> = {}) {
    this.params = { ...DEFAULT_PARAMS, ...params };
  }

  setBuildings(buildings: Building[]): void {
    this.buildings = buildings;
  }

  initFlowField(nx: number, ny: number, nz: number, dx: number, dy: number, dz: number, inletVelocity: number): FlowField {
    const size = nx * ny * nz;
    const field: FlowField = {
      u: new Float32Array(size),
      v: new Float32Array(size),
      w: new Float32Array(size),
      k: new Float32Array(size),
      epsilon: new Float32Array(size),
      nu_t: new Float32Array(size),
      pressure: new Float32Array(size),
      nx, ny, nz, dx, dy, dz
    };

    for (let k = 0; k < nz; k++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const idx = this.getIndex(i, j, k, nx, ny);
          const z = k * dz;
          field.u[idx] = inletVelocity * Math.pow(z / 300, 0.16);
          field.v[idx] = 0;
          field.w[idx] = 0;
          
          const I = 0.1;
          field.k[idx] = 1.5 * Math.pow(field.u[idx] * I, 2);
          field.epsilon[idx] = Math.pow(this.params.C_mu, 0.75) * Math.pow(field.k[idx], 1.5) / (0.07 * 300);
          field.nu_t[idx] = this.params.C_mu * field.k[idx] * field.k[idx] / field.epsilon[idx];
        }
      }
    }

    this.applyBuildingMask(field);
    return field;
  }

  private getIndex(i: number, j: number, k: number, nx: number, ny: number): number {
    return k * nx * ny + j * nx + i;
  }

  private isInsideBuilding(i: number, j: number, k: number, dx: number, dy: number, dz: number): boolean {
    const x = i * dx;
    const y = j * dy;
    const z = k * dz;

    return this.buildings.some(b => 
      x >= b.x && x <= b.x + b.width &&
      y >= b.y && y <= b.y + b.depth &&
      z >= b.z && z <= b.z + b.height
    );
  }

  private applyBuildingMask(field: FlowField): void {
    const { nx, ny, nz, dx, dy, dz } = field;
    
    for (let k = 0; k < nz; k++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          if (this.isInsideBuilding(i, j, k, dx, dy, dz)) {
            const idx = this.getIndex(i, j, k, nx, ny);
            field.u[idx] = 0;
            field.v[idx] = 0;
            field.w[idx] = 0;
            field.k[idx] = 0;
            field.epsilon[idx] = 0;
            field.nu_t[idx] = 0;
          }
        }
      }
    }
  }

  async solve(field: FlowField, iterations: number = 50): Promise<void> {
    for (let iter = 0; iter < iterations; iter++) {
      this.solveMomentum(field);
      this.solvePressureCorrection(field);
      this.solveK(field);
      this.solveEpsilon(field);
      this.updateEddyViscosity(field);
      this.applyBuildingMask(field);
      
      if (iter % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    this.calculateSurfacePressure(field);
  }

  private solveMomentum(field: FlowField): void {
    const { nx, ny, nz, dx, dy, dz } = field;
    const newU = new Float32Array(field.u);
    const newV = new Float32Array(field.v);
    const newW = new Float32Array(field.w);

    for (let k = 1; k < nz - 1; k++) {
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          if (this.isInsideBuilding(i, j, k, dx, dy, dz)) continue;
          
          const idx = this.getIndex(i, j, k, nx, ny);
          const nu_eff = 1.5e-5 + field.nu_t[idx];
          
          const dudx = (field.u[idx + 1] - field.u[idx - 1]) / (2 * dx);
          const dudy = (field.u[this.getIndex(i, j + 1, k, nx, ny)] - field.u[this.getIndex(i, j - 1, k, nx, ny)]) / (2 * dy);
          const dudz = (field.u[this.getIndex(i, j, k + 1, nx, ny)] - field.u[this.getIndex(i, j, k - 1, nx, ny)]) / (2 * dz);
          
          const d2udx2 = (field.u[idx + 1] - 2 * field.u[idx] + field.u[idx - 1]) / (dx * dx);
          const d2udy2 = (field.u[this.getIndex(i, j + 1, k, nx, ny)] - 2 * field.u[idx] + field.u[this.getIndex(i, j - 1, k, nx, ny)]) / (dy * dy);
          const d2udz2 = (field.u[this.getIndex(i, j, k + 1, nx, ny)] - 2 * field.u[idx] + field.u[this.getIndex(i, j, k - 1, nx, ny)]) / (dz * dz);
          
          const convection = field.u[idx] * dudx + field.v[idx] * dudy + field.w[idx] * dudz;
          const diffusion = nu_eff * (d2udx2 + d2udy2 + d2udz2);
          
          const dpdx = (field.pressure[idx + 1] - field.pressure[idx - 1]) / (2 * dx);
          
          const dt = 0.01;
          newU[idx] = field.u[idx] + dt * (-convection + diffusion - dpdx);
          
          const dvdx = (field.v[idx + 1] - field.v[idx - 1]) / (2 * dx);
          const dvdy = (field.v[this.getIndex(i, j + 1, k, nx, ny)] - field.v[this.getIndex(i, j - 1, k, nx, ny)]) / (2 * dy);
          const dvdz = (field.v[this.getIndex(i, j, k + 1, nx, ny)] - field.v[this.getIndex(i, j, k - 1, nx, ny)]) / (2 * dz);
          
          const d2vdx2 = (field.v[idx + 1] - 2 * field.v[idx] + field.v[idx - 1]) / (dx * dx);
          const d2vdy2 = (field.v[this.getIndex(i, j + 1, k, nx, ny)] - 2 * field.v[idx] + field.v[this.getIndex(i, j - 1, k, nx, ny)]) / (dy * dy);
          const d2vdz2 = (field.v[this.getIndex(i, j, k + 1, nx, ny)] - 2 * field.v[idx] + field.v[this.getIndex(i, j, k - 1, nx, ny)]) / (dz * dz);
          
          const convectionV = field.u[idx] * dvdx + field.v[idx] * dvdy + field.w[idx] * dvdz;
          const diffusionV = nu_eff * (d2vdx2 + d2vdy2 + d2vdz2);
          const dpdy = (field.pressure[this.getIndex(i, j + 1, k, nx, ny)] - field.pressure[this.getIndex(i, j - 1, k, nx, ny)]) / (2 * dy);
          
          newV[idx] = field.v[idx] + dt * (-convectionV + diffusionV - dpdy);
          
          const dwdx = (field.w[idx + 1] - field.w[idx - 1]) / (2 * dx);
          const dwdy = (field.w[this.getIndex(i, j + 1, k, nx, ny)] - field.w[this.getIndex(i, j - 1, k, nx, ny)]) / (2 * dy);
          const dwdz = (field.w[this.getIndex(i, j, k + 1, nx, ny)] - field.w[this.getIndex(i, j, k - 1, nx, ny)]) / (2 * dz);
          
          const d2wdx2 = (field.w[idx + 1] - 2 * field.w[idx] + field.w[idx - 1]) / (dx * dx);
          const d2wdy2 = (field.w[this.getIndex(i, j + 1, k, nx, ny)] - 2 * field.w[idx] + field.w[this.getIndex(i, j - 1, k, nx, ny)]) / (dy * dy);
          const d2wdz2 = (field.w[this.getIndex(i, j, k + 1, nx, ny)] - 2 * field.w[idx] + field.w[this.getIndex(i, j, k - 1, nx, ny)]) / (dz * dz);
          
          const convectionW = field.u[idx] * dwdx + field.w[idx] * dwdy + field.w[idx] * dwdz;
          const diffusionW = nu_eff * (d2wdx2 + d2wdy2 + d2wdz2);
          const dpdz = (field.pressure[this.getIndex(i, j, k + 1, nx, ny)] - field.pressure[this.getIndex(i, j, k - 1, nx, ny)]) / (2 * dz);
          
          newW[idx] = field.w[idx] + dt * (-convectionW + diffusionW - dpdz);
        }
      }
    }

    field.u.set(newU);
    field.v.set(newV);
    field.w.set(newW);
  }

  private solvePressureCorrection(field: FlowField): void {
    const { nx, ny, nz, dx, dy, dz } = field;
    const pPrime = new Float32Array(field.pressure.length);
    const source = new Float32Array(field.pressure.length);

    for (let k = 1; k < nz - 1; k++) {
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          if (this.isInsideBuilding(i, j, k, dx, dy, dz)) continue;
          
          const idx = this.getIndex(i, j, k, nx, ny);
          const dudx = (field.u[idx + 1] - field.u[idx - 1]) / (2 * dx);
          const dvdy = (field.v[this.getIndex(i, j + 1, k, nx, ny)] - field.v[this.getIndex(i, j - 1, k, nx, ny)]) / (2 * dy);
          const dwdz = (field.w[this.getIndex(i, j, k + 1, nx, ny)] - field.w[this.getIndex(i, j, k - 1, nx, ny)]) / (2 * dz);
          
          source[idx] = (dudx + dvdy + dwdz) / 0.01;
        }
      }
    }

    for (let iter = 0; iter < 20; iter++) {
      const newPPrime = new Float32Array(pPrime);
      
      for (let k = 1; k < nz - 1; k++) {
        for (let j = 1; j < ny - 1; j++) {
          for (let i = 1; i < nx - 1; i++) {
            if (this.isInsideBuilding(i, j, k, dx, dy, dz)) continue;
            
            const idx = this.getIndex(i, j, k, nx, ny);
            const aP = 2 / (dx * dx) + 2 / (dy * dy) + 2 / (dz * dz);
            
            const neighborSum = 
              (pPrime[idx + 1] + pPrime[idx - 1]) / (dx * dx) +
              (pPrime[this.getIndex(i, j + 1, k, nx, ny)] + pPrime[this.getIndex(i, j - 1, k, nx, ny)]) / (dy * dy) +
              (pPrime[this.getIndex(i, j, k + 1, nx, ny)] + pPrime[this.getIndex(i, j, k - 1, nx, ny)]) / (dz * dz);
            
            newPPrime[idx] = (neighborSum - source[idx]) / aP;
          }
        }
      }
      
      pPrime.set(newPPrime);
    }

    for (let k = 1; k < nz - 1; k++) {
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          if (this.isInsideBuilding(i, j, k, dx, dy, dz)) continue;
          
          const idx = this.getIndex(i, j, k, nx, ny);
          field.pressure[idx] += pPrime[idx];
          
          field.u[idx] -= 0.01 * (pPrime[idx + 1] - pPrime[idx - 1]) / (2 * dx);
          field.v[idx] -= 0.01 * (pPrime[this.getIndex(i, j + 1, k, nx, ny)] - pPrime[this.getIndex(i, j - 1, k, nx, ny)]) / (2 * dy);
          field.w[idx] -= 0.01 * (pPrime[this.getIndex(i, j, k + 1, nx, ny)] - pPrime[this.getIndex(i, j, k - 1, nx, ny)]) / (2 * dz);
        }
      }
    }
  }

  private solveK(field: FlowField): void {
    const { nx, ny, nz, dx, dy, dz } = field;
    const newK = new Float32Array(field.k);

    for (let k = 1; k < nz - 1; k++) {
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          if (this.isInsideBuilding(i, j, k, dx, dy, dz)) continue;
          
          const idx = this.getIndex(i, j, k, nx, ny);
          
          const dkdx = (field.k[idx + 1] - field.k[idx - 1]) / (2 * dx);
          const dkdy = (field.k[this.getIndex(i, j + 1, k, nx, ny)] - field.k[this.getIndex(i, j - 1, k, nx, ny)]) / (2 * dy);
          const dkdz = (field.k[this.getIndex(i, j, k + 1, nx, ny)] - field.k[this.getIndex(i, j, k - 1, nx, ny)]) / (2 * dz);
          
          const convection = field.u[idx] * dkdx + field.v[idx] * dkdy + field.w[idx] * dkdz;
          
          const d2kdx2 = (field.k[idx + 1] - 2 * field.k[idx] + field.k[idx - 1]) / (dx * dx);
          const d2kdy2 = (field.k[this.getIndex(i, j + 1, k, nx, ny)] - 2 * field.k[idx] + field.k[this.getIndex(i, j - 1, k, nx, ny)]) / (dy * dy);
          const d2kdz2 = (field.k[this.getIndex(i, j, k + 1, nx, ny)] - 2 * field.k[idx] + field.k[this.getIndex(i, j, k - 1, nx, ny)]) / (dz * dz);
          
          const nu_eff = 1.5e-5 + field.nu_t[idx] / this.params.sigma_k;
          const diffusion = nu_eff * (d2kdx2 + d2kdy2 + d2kdz2);
          
          const P = this.calculateProduction(field, i, j, k);
          const D = field.epsilon[idx];
          
          const dt = 0.01;
          newK[idx] = field.k[idx] + dt * (-convection + diffusion + P - D);
          
          if (newK[idx] < 1e-6) newK[idx] = 1e-6;
        }
      }
    }

    field.k.set(newK);
  }

  private solveEpsilon(field: FlowField): void {
    const { nx, ny, nz, dx, dy, dz } = field;
    const newEpsilon = new Float32Array(field.epsilon);

    for (let k = 1; k < nz - 1; k++) {
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          if (this.isInsideBuilding(i, j, k, dx, dy, dz)) continue;
          
          const idx = this.getIndex(i, j, k, nx, ny);
          
          const depsdx = (field.epsilon[idx + 1] - field.epsilon[idx - 1]) / (2 * dx);
          const depsdy = (field.epsilon[this.getIndex(i, j + 1, k, nx, ny)] - field.epsilon[this.getIndex(i, j - 1, k, nx, ny)]) / (2 * dy);
          const depsdz = (field.epsilon[this.getIndex(i, j, k + 1, nx, ny)] - field.epsilon[this.getIndex(i, j, k - 1, nx, ny)]) / (2 * dz);
          
          const convection = field.u[idx] * depsdx + field.v[idx] * depsdy + field.w[idx] * depsdz;
          
          const d2epsdx2 = (field.epsilon[idx + 1] - 2 * field.epsilon[idx] + field.epsilon[idx - 1]) / (dx * dx);
          const d2epsdy2 = (field.epsilon[this.getIndex(i, j + 1, k, nx, ny)] - 2 * field.epsilon[idx] + field.epsilon[this.getIndex(i, j - 1, k, nx, ny)]) / (dy * dy);
          const d2epsdz2 = (field.epsilon[this.getIndex(i, j, k + 1, nx, ny)] - 2 * field.epsilon[idx] + field.epsilon[this.getIndex(i, j, k - 1, nx, ny)]) / (dz * dz);
          
          const nu_eff = 1.5e-5 + field.nu_t[idx] / this.params.sigma_epsilon;
          const diffusion = nu_eff * (d2epsdx2 + d2epsdy2 + d2epsdz2);
          
          const P = this.calculateProduction(field, i, j, k);
          const eta = Math.sqrt(field.k[idx]) * P / (this.params.C_mu * field.k[idx] * field.epsilon[idx]);
          const R_eta = eta * (1 - eta / 4.38) / (1 + 0.012 * Math.pow(eta, 3));
          
          const C_epsilon1 = this.params.C_epsilon1 - R_eta;
          
          const dt = 0.01;
          newEpsilon[idx] = field.epsilon[idx] + dt * (
            -convection + diffusion + 
            C_epsilon1 * P * field.epsilon[idx] / field.k[idx] - 
            this.params.C_epsilon2 * field.epsilon[idx] * field.epsilon[idx] / field.k[idx]
          );
          
          if (newEpsilon[idx] < 1e-6) newEpsilon[idx] = 1e-6;
        }
      }
    }

    field.epsilon.set(newEpsilon);
  }

  private calculateProduction(field: FlowField, i: number, j: number, k: number): number {
    const { nx, ny, nz, dx, dy, dz } = field;
    const idx = this.getIndex(i, j, k, nx, ny);
    
    const dudx = (field.u[idx + 1] - field.u[idx - 1]) / (2 * dx);
    const dudy = (field.u[this.getIndex(i, j + 1, k, nx, ny)] - field.u[this.getIndex(i, j - 1, k, nx, ny)]) / (2 * dy);
    const dudz = (field.u[this.getIndex(i, j, k + 1, nx, ny)] - field.u[this.getIndex(i, j, k - 1, nx, ny)]) / (2 * dz);
    
    const dvdx = (field.v[idx + 1] - field.v[idx - 1]) / (2 * dx);
    const dvdy = (field.v[this.getIndex(i, j + 1, k, nx, ny)] - field.v[this.getIndex(i, j - 1, k, nx, ny)]) / (2 * dy);
    const dvdz = (field.v[this.getIndex(i, j, k + 1, nx, ny)] - field.v[this.getIndex(i, j, k - 1, nx, ny)]) / (2 * dz);
    
    const dwdx = (field.w[idx + 1] - field.w[idx - 1]) / (2 * dx);
    const dwdy = (field.w[this.getIndex(i, j + 1, k, nx, ny)] - field.w[this.getIndex(i, j - 1, k, nx, ny)]) / (2 * dy);
    const dwdz = (field.w[this.getIndex(i, j, k + 1, nx, ny)] - field.w[this.getIndex(i, j, k - 1, nx, ny)]) / (2 * dz);
    
    const S11 = dudx;
    const S22 = dvdy;
    const S33 = dwdz;
    const S12 = 0.5 * (dudy + dvdx);
    const S13 = 0.5 * (dudz + dwdx);
    const S23 = 0.5 * (dvdz + dwdy);
    
    const S2 = 2 * (S11 * S11 + S22 * S22 + S33 * S33 + 2 * S12 * S12 + 2 * S13 * S13 + 2 * S23 * S23);
    
    return field.nu_t[idx] * S2;
  }

  private updateEddyViscosity(field: FlowField): void {
    for (let i = 0; i < field.nu_t.length; i++) {
      if (field.k[i] > 0 && field.epsilon[i] > 0) {
        field.nu_t[i] = this.params.C_mu * field.k[i] * field.k[i] / field.epsilon[i];
      } else {
        field.nu_t[i] = 0;
      }
    }
  }

  private calculateSurfacePressure(field: FlowField): void {
    const { nx, ny, nz, dx, dy, dz } = field;

    this.buildings.forEach(building => {
      const surfacePoints = 6 * Math.ceil(building.width / dx) * Math.ceil(building.height / dz);
      const pressure = new Float32Array(surfacePoints);
      let pointIdx = 0;

      for (let face = 0; face < 6; face++) {
        const steps = face < 4 ? Math.ceil(building.height / dz) : Math.ceil(building.depth / dy);
        const horizSteps = face < 4 ? Math.ceil(building.width / dx) : Math.ceil(building.depth / dy);

        for (let s = 0; s < steps; s++) {
          for (let h = 0; h < horizSteps; h++) {
            let i: number, j: number, k: number;
            
            switch (face) {
              case 0:
                i = Math.floor(building.x / dx);
                j = Math.floor((building.y + h * dx) / dy);
                k = Math.floor((building.z + s * dz) / dz);
                break;
              case 1:
                i = Math.floor((building.x + building.width) / dx);
                j = Math.floor((building.y + h * dx) / dy);
                k = Math.floor((building.z + s * dz) / dz);
                break;
              case 2:
                i = Math.floor((building.x + h * dx) / dx);
                j = Math.floor(building.y / dy);
                k = Math.floor((building.z + s * dz) / dz);
                break;
              case 3:
                i = Math.floor((building.x + h * dx) / dx);
                j = Math.floor((building.y + building.depth) / dy);
                k = Math.floor((building.z + s * dz) / dz);
                break;
              case 4:
                i = Math.floor((building.x + h * dx) / dx);
                j = Math.floor((building.y + s * dy) / dy);
                k = Math.floor(building.z / dz);
                break;
              default:
                i = Math.floor((building.x + h * dx) / dx);
                j = Math.floor((building.y + s * dy) / dy);
                k = Math.floor((building.z + building.height) / dz);
            }

            i = Math.max(0, Math.min(nx - 1, i));
            j = Math.max(0, Math.min(ny - 1, j));
            k = Math.max(0, Math.min(nz - 1, k));

            const idx = this.getIndex(i, j, k, nx, ny);
            pressure[pointIdx++] = field.pressure[idx];
          }
        }
      }

      building.surfacePressure = pressure;
    });
  }

  calculateStreetCanyonEffect(field: FlowField, canyonWidth: number, buildingHeight: number): {
    velocityAmplification: number;
    turbulenceIntensity: number;
    pressureCoefficient: number;
  } {
    const hRatio = canyonWidth / buildingHeight;
    const velocityAmp = 1.0 + 0.3 * Math.exp(-hRatio / 1.5);
    const turbulenceInt = 0.1 + 0.2 * (1 - Math.exp(-hRatio / 2.0));
    const pressureCoeff = -0.5 + 0.8 * Math.exp(-hRatio);

    return {
      velocityAmplification: velocityAmp,
      turbulenceIntensity: turbulenceInt,
      pressureCoefficient: pressureCoeff
    };
  }

  getWindSpeedAtPoint(field: FlowField, x: number, y: number, z: number): { u: number; v: number; w: number; speed: number } {
    const i = Math.floor(x / field.dx);
    const j = Math.floor(y / field.dy);
    const k = Math.floor(z / field.dz);
    
    const idx = this.getIndex(
      Math.max(0, Math.min(field.nx - 1, i)),
      Math.max(0, Math.min(field.ny - 1, j)),
      Math.max(0, Math.min(field.nz - 1, k)),
      field.nx,
      field.ny
    );

    const u = field.u[idx];
    const v = field.v[idx];
    const w = field.w[idx];
    const speed = Math.sqrt(u * u + v * v + w * w);

    return { u, v, w, speed };
  }
}
