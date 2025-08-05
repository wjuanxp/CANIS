/**
 * Analysis Algorithms Utility Module
 * 
 * This module contains implementations of various spectroscopic analysis algorithms
 * including baseline correction, peak detection, and integration methods.
 */

// Matrix operations utilities
class Matrix {
  data: number[][];
  rows: number;
  cols: number;

  constructor(rows: number, cols: number, initialValue: number = 0) {
    this.rows = rows;
    this.cols = cols;
    this.data = Array(rows).fill(null).map(() => Array(cols).fill(initialValue));
  }

  static fromArray(arr: number[][]): Matrix {
    const rows = arr.length;
    const cols = arr[0]?.length || 0;
    const matrix = new Matrix(rows, cols);
    matrix.data = arr.map(row => [...row]);
    return matrix;
  }

  get(row: number, col: number): number {
    return this.data[row][col];
  }

  set(row: number, col: number, value: number): void {
    this.data[row][col] = value;
  }

  // Matrix multiplication
  multiply(other: Matrix): Matrix {
    if (this.cols !== other.rows) {
      throw new Error('Matrix dimensions do not match for multiplication');
    }

    const result = new Matrix(this.rows, other.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < other.cols; j++) {
        let sum = 0;
        for (let k = 0; k < this.cols; k++) {
          sum += this.get(i, k) * other.get(k, j);
        }
        result.set(i, j, sum);
      }
    }
    return result;
  }

  // Matrix addition
  add(other: Matrix): Matrix {
    if (this.rows !== other.rows || this.cols !== other.cols) {
      throw new Error('Matrix dimensions do not match for addition');
    }

    const result = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        result.set(i, j, this.get(i, j) + other.get(i, j));
      }
    }
    return result;
  }

  // Transpose
  transpose(): Matrix {
    const result = new Matrix(this.cols, this.rows);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        result.set(j, i, this.get(i, j));
      }
    }
    return result;
  }

  // Convert to 1D array (for vector operations)
  toVector(): number[] {
    if (this.cols === 1) {
      return this.data.map(row => row[0]);
    } else if (this.rows === 1) {
      return this.data[0];
    }
    throw new Error('Matrix is not a vector');
  }

  // Create diagonal matrix
  static diagonal(values: number[]): Matrix {
    const n = values.length;
    const matrix = new Matrix(n, n);
    for (let i = 0; i < n; i++) {
      matrix.set(i, i, values[i]);
    }
    return matrix;
  }

  // Create identity matrix
  static identity(size: number): Matrix {
    const matrix = new Matrix(size, size);
    for (let i = 0; i < size; i++) {
      matrix.set(i, i, 1);
    }
    return matrix;
  }
}

/**
 * Create difference matrix for smoothness constraint in ALS
 * @param n Size of the matrix
 * @param order Order of differences (1 or 2)
 * @returns Matrix representing the difference operator
 */
function createDifferenceMatrix(n: number, order: number = 2): Matrix {
  const size = n - order;
  const D = new Matrix(size, n);

  for (let i = 0; i < size; i++) {
    if (order === 1) {
      D.set(i, i, -1);
      D.set(i, i + 1, 1);
    } else if (order === 2) {
      D.set(i, i, 1);
      D.set(i, i + 1, -2);
      D.set(i, i + 2, 1);
    }
  }

  return D;
}

/**
 * Solve linear system using Cholesky decomposition (simplified implementation)
 * For the equation Ax = b, where A is positive definite
 */
function solveLinearSystem(A: Matrix, b: number[]): number[] {
  const n = A.rows;
  
  // Simplified conjugate gradient method for large systems
  let x = new Array(n).fill(0);
  let r = [...b]; // residual
  let p = [...r]; // search direction
  
  const maxIterations = Math.min(n, 50); // Limit iterations for performance
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Calculate Ap
    const Ap = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        Ap[i] += A.get(i, j) * p[j];
      }
    }
    
    // Calculate alpha
    let rTr = 0;
    let pTAp = 0;
    for (let i = 0; i < n; i++) {
      rTr += r[i] * r[i];
      pTAp += p[i] * Ap[i];
    }
    
    if (Math.abs(pTAp) < 1e-12) break;
    
    const alpha = rTr / pTAp;
    
    // Update x and r
    const newR = new Array(n);
    for (let i = 0; i < n; i++) {
      x[i] += alpha * p[i];
      newR[i] = r[i] - alpha * Ap[i];
    }
    
    // Calculate beta
    let newRTnewR = 0;
    for (let i = 0; i < n; i++) {
      newRTnewR += newR[i] * newR[i];
    }
    
    if (newRTnewR < 1e-12) break; // Converged
    
    const beta = newRTnewR / rTr;
    
    // Update p and r
    for (let i = 0; i < n; i++) {
      p[i] = newR[i] + beta * p[i];
      r[i] = newR[i];
    }
  }
  
  return x;
}

/**
 * Asymmetric Least Squares (ALS) Baseline Correction
 * 
 * This is the proper implementation of the ALS algorithm as described in:
 * Eilers, P.H.C. and Boelens, H.F.M. (2005) "Baseline Correction with Asymmetric 
 * Least Squares Smoothing" Leiden University Medical Centre Technical Report.
 * 
 * @param y Intensity values
 * @param lambda Smoothness parameter (larger = smoother baseline)
 * @param p Asymmetry parameter (0 < p < 1, smaller = more asymmetric)
 * @param maxIterations Maximum number of iterations
 * @returns Baseline corrected spectrum and baseline points
 */
export function alsBaselineCorrection(
  y: number[], 
  lambda: number = 1000, 
  p: number = 0.01, 
  maxIterations: number = 10
): { corrected: number[], baseline: number[] } {
  
  const n = y.length;
  
  // Create second-order difference matrix
  const D = createDifferenceMatrix(n, 2);
  const DT = D.transpose();
  const DTD = DT.multiply(D);
  
  // Initialize weights (all equal initially)
  let w = new Array(n).fill(1);
  let baseline = [...y]; // Initial baseline estimate
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const prevBaseline = [...baseline];
    
    // Create weight matrix W
    const W = Matrix.diagonal(w);
    
    // Solve (W + λD'D)z = Wy for baseline z
    // This is equivalent to solving the weighted penalized least squares problem
    const A = new Matrix(n, n);
    
    // A = W + λD'D
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        A.set(i, j, W.get(i, j) + lambda * DTD.get(i, j));
      }
    }
    
    // Right-hand side: Wy
    const b = new Array(n);
    for (let i = 0; i < n; i++) {
      b[i] = w[i] * y[i];
    }
    
    // Solve linear system
    baseline = solveLinearSystem(A, b);
    
    // Update weights based on asymmetry
    for (let i = 0; i < n; i++) {
      if (y[i] >= baseline[i]) {
        w[i] = p; // Points above baseline get lower weight
      } else {
        w[i] = 1 - p; // Points below baseline get higher weight
      }
    }
    
    // Check convergence
    let maxDiff = 0;
    for (let i = 0; i < n; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(baseline[i] - prevBaseline[i]));
    }
    
    if (maxDiff < 1e-6) {
      break; // Converged
    }
  }
  
  // Calculate corrected spectrum
  const corrected = y.map((val, i) => Math.max(0, val - baseline[i]));
  
  return { corrected, baseline };
}

/**
 * Alternative simplified ALS for performance when exact implementation is too slow
 */
export function alsBaselineCorrectionSimplified(
  y: number[], 
  lambda: number = 1000, 
  p: number = 0.01, 
  maxIterations: number = 10
): { corrected: number[], baseline: number[] } {
  
  const n = y.length;
  let w = new Array(n).fill(1);
  let baseline = [...y];
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Weighted smoothing with penalty for deviations
    const newBaseline = new Array(n);
    
    // Apply smoothing with weights
    for (let i = 0; i < n; i++) {
      if (i === 0 || i === n - 1) {
        newBaseline[i] = baseline[i];
        continue;
      }
      
      // Weighted average with smoothness penalty
      const smoothnessPenalty = lambda / 1000; // Normalize lambda
      const localWeight = w[i];
      
      // Second-order smoothing
      const smoothed = (baseline[i-1] + 2 * baseline[i] + baseline[i+1]) / 4;
      const weighted = localWeight * y[i] + (1 - localWeight) * smoothed;
      
      newBaseline[i] = (1 - smoothnessPenalty) * weighted + smoothnessPenalty * smoothed;
    }
    
    baseline = newBaseline;
    
    // Update weights
    for (let i = 0; i < n; i++) {
      if (y[i] >= baseline[i]) {
        w[i] = p;
      } else {
        w[i] = 1 - p;
      }
    }
  }
  
  const corrected = y.map((val, i) => Math.max(0, val - baseline[i]));
  
  return { corrected, baseline };
}

/**
 * Polynomial baseline correction
 */
export function polynomialBaselineCorrection(
  x: number[], 
  y: number[], 
  degree: number = 3
): { corrected: number[], baseline: number[] } {
  
  const n = y.length;
  
  // Find potential baseline points (local minima in windows)
  const windowSize = Math.max(10, Math.floor(n / 50));
  const baselineIndices: number[] = [];
  
  for (let i = 0; i < n; i += windowSize) {
    const end = Math.min(i + windowSize, n);
    let minIdx = i;
    let minVal = y[i];
    
    for (let j = i; j < end; j++) {
      if (y[j] < minVal) {
        minVal = y[j];
        minIdx = j;
      }
    }
    baselineIndices.push(minIdx);
  }
  
  // Fit polynomial to baseline points
  const baselineX = baselineIndices.map(i => x[i]);
  const baselineY = baselineIndices.map(i => y[i]);
  
  // Simple polynomial fitting (linear regression for simplicity)
  const baseline = new Array(n);
  
  if (degree === 1) {
    // Linear fit
    const n_points = baselineX.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n_points; i++) {
      sumX += baselineX[i];
      sumY += baselineY[i];
      sumXY += baselineX[i] * baselineY[i];
      sumX2 += baselineX[i] * baselineX[i];
    }
    
    const slope = (n_points * sumXY - sumX * sumY) / (n_points * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n_points;
    
    for (let i = 0; i < n; i++) {
      baseline[i] = slope * x[i] + intercept;
    }
  } else {
    // For higher degrees, use interpolation between baseline points
    for (let i = 0; i < n; i++) {
      // Find surrounding baseline points for interpolation
      let leftIdx = 0;
      let rightIdx = baselineIndices.length - 1;
      
      for (let j = 0; j < baselineIndices.length - 1; j++) {
        if (i >= baselineIndices[j] && i <= baselineIndices[j + 1]) {
          leftIdx = j;
          rightIdx = j + 1;
          break;
        }
      }
      
      // Linear interpolation between baseline points
      const leftI = baselineIndices[leftIdx];
      const rightI = baselineIndices[rightIdx];
      
      if (leftI === rightI) {
        baseline[i] = y[leftI];
      } else {
        const ratio = (i - leftI) / (rightI - leftI);
        baseline[i] = y[leftI] + ratio * (y[rightI] - y[leftI]);
      }
    }
  }
  
  const corrected = y.map((val, i) => Math.max(0, val - baseline[i]));
  
  return { corrected, baseline };
}

/**
 * Linear baseline correction (connects first and last points)
 */
export function linearBaselineCorrection(
  x: number[], 
  y: number[]
): { corrected: number[], baseline: number[] } {
  
  const n = y.length;
  const baseline = new Array(n);
  
  // Simple linear interpolation from first to last point
  const slope = (y[n-1] - y[0]) / (x[n-1] - x[0]);
  const intercept = y[0] - slope * x[0];
  
  for (let i = 0; i < n; i++) {
    baseline[i] = slope * x[i] + intercept;
  }
  
  const corrected = y.map((val, i) => Math.max(0, val - baseline[i]));
  
  return { corrected, baseline };
}

/**
 * Get recommended lambda values for different spectroscopic techniques
 */
export function getRecommendedLambda(technique: string): { min: number, max: number, default: number } {
  const recommendations: Record<string, { min: number, max: number, default: number }> = {
    'uv-vis': { min: 100, max: 10000, default: 1000 },
    'ir': { min: 1000, max: 100000, default: 10000 },
    'raman': { min: 100, max: 50000, default: 5000 },
    'libs': { min: 10, max: 1000, default: 100 },
    'xrf': { min: 100, max: 10000, default: 1000 },
    'default': { min: 100, max: 10000, default: 1000 }
  };
  
  return recommendations[technique.toLowerCase()] || recommendations['default'];
}

/**
 * Peak Detection Interface
 */
export interface DetectedPeak {
  id: string;
  x: number;
  y: number;
  prominence: number;
  width?: number;
  leftBase?: number;
  rightBase?: number;
}

/**
 * Advanced Peak Detection Algorithm
 * 
 * This implements a robust peak detection algorithm that:
 * 1. Finds local maxima (or minima for valleys)
 * 2. Calculates prominence (height above surrounding minima or depth below surrounding maxima)
 * 3. Filters based on minimum prominence and distance
 * 4. Estimates peak width at half maximum (or half minimum for valleys)
 * 
 * @param x X-axis values (wavelength, wavenumber, etc.)
 * @param y Y-axis values (intensity, absorbance, etc.)
 * @param params Peak detection parameters
 * @returns Array of detected peaks
 */
export function detectPeaks(
  x: number[], 
  y: number[], 
  params: {
    prominence?: number;
    distance?: number;
    width?: number;
    threshold?: number;
    relativeThreshold?: number;
    detectValleys?: boolean; // New parameter for detecting valleys (downward peaks)
    technique?: string; // Technique information for context
    dataMode?: 'absorbance' | 'transmittance'; // Data mode information
  } = {}
): DetectedPeak[] {
  
  const {
    prominence = 0.01, // Minimum prominence (relative to max intensity)
    distance = 5, // Minimum distance between peaks (in data points)
    width = 2, // Minimum peak width in data points
    threshold = 0.001, // Absolute threshold
    relativeThreshold = 0.05, // Relative threshold (fraction of max intensity)
    detectValleys = false, // Whether to detect valleys instead of peaks
    technique = '',
    dataMode = 'absorbance'
  } = params;
  
  // Auto-determine if we should detect valleys based on technique and data mode
  const shouldDetectValleys = detectValleys || 
    (dataMode === 'transmittance' && ['uv-vis', 'uv', 'vis', 'ir', 'infrared'].includes(technique.toLowerCase()));
  
  if (x.length !== y.length || x.length < 3) {
    return [];
  }
  
  const n = y.length;
  const peaks: DetectedPeak[] = [];
  
  // Calculate thresholds
  const maxIntensity = Math.max(...y);
  const minIntensity = Math.min(...y);
  const intensityRange = maxIntensity - minIntensity;
  const absoluteProminence = prominence * intensityRange;
  const absoluteThreshold = Math.max(threshold, relativeThreshold * maxIntensity);
  
  // Find local maxima or minima based on mode
  for (let i = 1; i < n - 1; i++) {
    const currentY = y[i];
    
    let isExtremum = false;
    
    if (shouldDetectValleys) {
      // For valleys (transmittance mode), look for local minima
      // Skip if above threshold (we want low values)
      if (currentY > maxIntensity - absoluteThreshold) continue;
      
      // Check if it's a local minimum
      isExtremum = currentY < y[i - 1] && currentY < y[i + 1];
    } else {
      // For peaks (absorbance mode), look for local maxima
      // Skip if below absolute threshold
      if (currentY < absoluteThreshold) continue;
      
      // Check if it's a local maximum
      isExtremum = currentY > y[i - 1] && currentY > y[i + 1];
    }
    
    if (!isExtremum) continue;
    
    // Calculate prominence differently for peaks vs valleys
    let leftExtreme = currentY;
    let rightExtreme = currentY;
    let leftBase = i;
    let rightBase = i;
    let peakProminence = 0;
    
    if (shouldDetectValleys) {
      // For valleys, find the highest points in surrounding regions
      // Search left for maximum
      for (let j = i - 1; j >= 0; j--) {
        if (y[j] > leftExtreme) {
          leftExtreme = y[j];
          leftBase = j;
        }
        // Stop if we encounter a lower valley
        if (y[j] < currentY) break;
      }
      
      // Search right for maximum
      for (let j = i + 1; j < n; j++) {
        if (y[j] > rightExtreme) {
          rightExtreme = y[j];
          rightBase = j;
        }
        // Stop if we encounter a lower valley
        if (y[j] < currentY) break;
      }
      
      // Calculate prominence as depth below the lower of the two surrounding maxima
      peakProminence = Math.min(leftExtreme, rightExtreme) - currentY;
    } else {
      // For peaks, find the lowest points in surrounding regions
      // Search left for minimum
      for (let j = i - 1; j >= 0; j--) {
        if (y[j] < leftExtreme) {
          leftExtreme = y[j];
          leftBase = j;
        }
        // Stop if we encounter a higher peak
        if (y[j] > currentY) break;
      }
      
      // Search right for minimum
      for (let j = i + 1; j < n; j++) {
        if (y[j] < rightExtreme) {
          rightExtreme = y[j];
          rightBase = j;
        }
        // Stop if we encounter a higher peak
        if (y[j] > currentY) break;
      }
      
      // Calculate prominence as height above the higher of the two surrounding minima
      peakProminence = currentY - Math.max(leftExtreme, rightExtreme);
    }
    
    // Check prominence requirement
    if (peakProminence < absoluteProminence) continue;
    
    // Estimate peak width at half maximum (or half minimum for valleys)
    let halfLevel = 0;
    let leftHalf = i;
    let rightHalf = i;
    
    if (shouldDetectValleys) {
      // For valleys, find half-minimum point
      halfLevel = (currentY + Math.min(leftExtreme, rightExtreme)) / 2;
      
      // Find left half-minimum point
      for (let j = i - 1; j >= leftBase; j--) {
        if (y[j] >= halfLevel) {
          leftHalf = j;
          break;
        }
      }
      
      // Find right half-minimum point
      for (let j = i + 1; j <= rightBase; j++) {
        if (y[j] >= halfLevel) {
          rightHalf = j;
          break;
        }
      }
    } else {
      // For peaks, find half-maximum point
      halfLevel = (currentY + Math.max(leftExtreme, rightExtreme)) / 2;
      
      // Find left half-maximum point
      for (let j = i - 1; j >= leftBase; j--) {
        if (y[j] <= halfLevel) {
          leftHalf = j;
          break;
        }
      }
      
      // Find right half-maximum point
      for (let j = i + 1; j <= rightBase; j++) {
        if (y[j] <= halfLevel) {
          rightHalf = j;
          break;
        }
      }
    }
    
    const peakWidth = rightHalf - leftHalf;
    
    // Check width requirement
    if (peakWidth < width) continue;
    
    // Check distance from existing peaks
    const tooClose = peaks.some(peak => {
      const peakIndex = x.findIndex(xVal => Math.abs(xVal - peak.x) < Number.EPSILON);
      return Math.abs(i - peakIndex) < distance;
    });
    
    if (tooClose) continue;
    
    // Add the peak
    peaks.push({
      id: `peak_${peaks.length}_${i}`,
      x: x[i],
      y: currentY,
      prominence: peakProminence,
      width: peakWidth,
      leftBase: x[leftBase],
      rightBase: x[rightBase]
    });
  }
  
  // Sort peaks by prominence (highest first)
  peaks.sort((a, b) => b.prominence - a.prominence);
  
  return peaks;
}

/**
 * Simplified peak detection for when the advanced algorithm is too slow
 */
export function detectPeaksSimplified(
  x: number[], 
  y: number[], 
  params: {
    prominence?: number;
    distance?: number;
    windowSize?: number;
    detectValleys?: boolean;
    technique?: string;
    dataMode?: 'absorbance' | 'transmittance';
  } = {}
): DetectedPeak[] {
  
  const {
    prominence = 0.05,
    distance = 10,
    windowSize = 5,
    detectValleys = false,
    technique = '',
    dataMode = 'absorbance'
  } = params;
  
  // Auto-determine if we should detect valleys based on technique and data mode
  const shouldDetectValleys = detectValleys || 
    (dataMode === 'transmittance' && ['uv-vis', 'uv', 'vis', 'ir', 'infrared'].includes(technique.toLowerCase()));
  
  if (x.length !== y.length || x.length < windowSize * 2 + 1) {
    return [];
  }
  
  const n = y.length;
  const peaks: DetectedPeak[] = [];
  const maxIntensity = Math.max(...y);
  const minIntensity = Math.min(...y);
  const intensityRange = maxIntensity - minIntensity;
  const minProminence = prominence * intensityRange;
  
  for (let i = windowSize; i < n - windowSize; i++) {
    const currentY = y[i];
    
    // Check if it's the maximum/minimum in the local window based on mode
    let isLocalExtremum = true;
    
    if (shouldDetectValleys) {
      // For valleys, check if it's the minimum in the local window
      for (let j = i - windowSize; j <= i + windowSize; j++) {
        if (j !== i && y[j] <= currentY) {
          isLocalExtremum = false;
          break;
        }
      }
    } else {
      // For peaks, check if it's the maximum in the local window
      for (let j = i - windowSize; j <= i + windowSize; j++) {
        if (j !== i && y[j] >= currentY) {
          isLocalExtremum = false;
          break;
        }
      }
    }
    
    if (!isLocalExtremum) continue;
    
    // Calculate local prominence based on mode
    let localProminence = 0;
    
    if (shouldDetectValleys) {
      // For valleys, prominence is depth below surrounding maxima
      const leftMax = Math.max(...y.slice(Math.max(0, i - windowSize * 2), i));
      const rightMax = Math.max(...y.slice(i + 1, Math.min(n, i + windowSize * 2 + 1)));
      localProminence = Math.min(leftMax, rightMax) - currentY;
    } else {
      // For peaks, prominence is height above surrounding minima
      const leftMin = Math.min(...y.slice(Math.max(0, i - windowSize * 2), i));
      const rightMin = Math.min(...y.slice(i + 1, Math.min(n, i + windowSize * 2 + 1)));
      localProminence = currentY - Math.max(leftMin, rightMin);
    }
    
    if (localProminence < minProminence) continue;
    
    // Check distance from existing peaks
    const tooClose = peaks.some(peak => Math.abs(peak.x - x[i]) < distance);
    if (tooClose) continue;
    
    peaks.push({
      id: `peak_${peaks.length}_${i}`,
      x: x[i],
      y: currentY,
      prominence: localProminence
    });
  }
  
  return peaks.sort((a, b) => b.prominence - a.prominence);
}

/**
 * Convert between absorbance and transmittance modes
 * 
 * For UV-Vis and IR spectroscopy, data can be displayed as either:
 * - Absorbance (A): A = -log10(T) where T is transmittance (0-1)
 * - Transmittance (%T): %T = 10^(-A) * 100
 * 
 * @param yData Y-axis intensity values
 * @param fromMode Current data mode ('absorbance' or 'transmittance')
 * @param toMode Target data mode ('absorbance' or 'transmittance')
 * @returns Converted y-axis values
 */
export function convertAbsorbanceTransmittance(
  yData: number[],
  fromMode: 'absorbance' | 'transmittance',
  toMode: 'absorbance' | 'transmittance'
): number[] {
  if (fromMode === toMode) {
    return [...yData]; // Return copy if no conversion needed
  }
  
  if (fromMode === 'absorbance' && toMode === 'transmittance') {
    // Convert Absorbance to %Transmittance: %T = 10^(-A) * 100
    return yData.map(absorbance => {
      // Clamp absorbance to reasonable range to avoid numerical issues
      const clampedA = Math.max(0, Math.min(10, absorbance));
      return Math.pow(10, -clampedA) * 100;
    });
  } else if (fromMode === 'transmittance' && toMode === 'absorbance') {
    // Convert %Transmittance to Absorbance: A = -log10(T/100)
    return yData.map(transmittance => {
      // Clamp transmittance to reasonable range (0.01% to 100%)
      const clampedT = Math.max(0.01, Math.min(100, transmittance));
      return -Math.log10(clampedT / 100);
    });
  }
  
  return [...yData];
}

/**
 * Determine the likely data mode based on y-values, technique, and metadata
 * 
 * @param yData Y-axis values
 * @param technique Spectroscopic technique
 * @param metadata Optional spectrum metadata (e.g., acquisition_parameters)
 * @returns Most likely data mode
 */
export function detectDataMode(
  yData: number[], 
  technique: string, 
  metadata?: Record<string, any>
): 'absorbance' | 'transmittance' {
  
  // First priority: Check YUNITS metadata from JCAMP-DX files
  if (metadata) {
    const yunits = metadata.YUNITS || metadata.yunits || metadata.yUnits;
    if (yunits) {
      const yunitsLower = String(yunits).toLowerCase();
      if (yunitsLower.includes('transmittance') || yunitsLower.includes('transmission') || 
          yunitsLower.includes('%t') || yunitsLower === 't') {
        return 'transmittance';
      }
      if (yunitsLower.includes('absorbance') || yunitsLower.includes('absorption') || 
          yunitsLower === 'a') {
        return 'absorbance';
      }
    }
    
    // Check other common metadata fields
    const dataType = metadata.dataType || metadata.DATA_TYPE || metadata.data_type;
    if (dataType) {
      const dataTypeLower = String(dataType).toLowerCase();
      if (dataTypeLower.includes('transmittance') || dataTypeLower.includes('transmission')) {
        return 'transmittance';
      }
      if (dataTypeLower.includes('absorbance') || dataTypeLower.includes('absorption')) {
        return 'absorbance';
      }
    }
  }
  
  // Second priority: Use heuristics based on data values
  const maxVal = Math.max(...yData);
  const minVal = Math.min(...yData);
  const avgVal = yData.reduce((sum, val) => sum + val, 0) / yData.length;
  
  // For UV-Vis and IR, use heuristics to detect mode
  if (['uv-vis', 'uv', 'vis', 'ir', 'infrared'].includes(technique.toLowerCase())) {
    // If values are mostly between 0-100 and average is high, likely transmittance
    if (maxVal <= 100 && minVal >= 0 && avgVal > 50) {
      return 'transmittance';
    }
    // If values are mostly small positive numbers, likely absorbance
    if (maxVal <= 5 && minVal >= 0 && avgVal < 2) {
      return 'absorbance';
    }
    // Default based on typical ranges
    if (maxVal > 100) {
      return 'transmittance'; // High values suggest %T
    }
  }
  
  // Third priority: Default based on technique
  return technique.toLowerCase().includes('ir') ? 'transmittance' : 'absorbance';
}

/**
 * Convert wavelength units for spectroscopic data
 * 
 * Common conversions for different spectroscopic techniques:
 * - IR: micrometers → wavenumbers (cm⁻¹)
 * - UV-Vis: nanometers ↔ wavelength units
 * - Raman: wavenumbers (cm⁻¹) typically
 * 
 * @param xData X-axis values
 * @param fromUnit Source unit
 * @param toUnit Target unit
 * @param technique Spectroscopic technique for context
 * @returns Converted x-axis values and unit information
 */
export function convertWavelengthUnits(
  xData: number[],
  fromUnit: string,
  toUnit?: string,
  technique?: string
): { 
  convertedX: number[]; 
  actualUnit: string; 
  wasConverted: boolean;
  conversionInfo?: string;
} {
  const fromUnitLower = fromUnit.toLowerCase();
  
  // Determine target unit based on technique if not specified
  if (!toUnit) {
    const techniqueLower = (technique || '').toLowerCase();
    if (['ir', 'infrared'].includes(techniqueLower)) {
      toUnit = 'wavenumbers'; // cm⁻¹
    } else if (['uv-vis', 'uv', 'vis'].includes(techniqueLower)) {
      toUnit = 'nanometers'; // nm
    } else if (['raman'].includes(techniqueLower)) {
      toUnit = 'wavenumbers'; // cm⁻¹
    } else {
      // No conversion needed if technique is unknown
      return {
        convertedX: [...xData],
        actualUnit: fromUnit,
        wasConverted: false
      };
    }
  }
  
  const toUnitLower = toUnit.toLowerCase();
  
  // If units are the same, no conversion needed
  if (fromUnitLower === toUnitLower || 
      (fromUnitLower.includes('wavenumber') && toUnitLower.includes('wavenumber')) ||
      (fromUnitLower.includes('nanometer') && toUnitLower.includes('nanometer'))) {
    return {
      convertedX: [...xData],
      actualUnit: fromUnit,
      wasConverted: false
    };
  }
  
  let convertedX: number[] = [];
  let actualUnit = fromUnit;
  let wasConverted = false;
  let conversionInfo = '';
  
  // Micrometers to Wavenumbers (cm⁻¹): ν = 10000 / λ
  if ((fromUnitLower.includes('micrometer') || fromUnitLower.includes('micron') || fromUnitLower === 'um') &&
      (toUnitLower.includes('wavenumber') || toUnitLower.includes('cm-1') || toUnitLower.includes('cm^-1'))) {
    
    convertedX = xData.map(wavelength => {
      // Avoid division by zero and handle very small values
      if (wavelength <= 0 || wavelength < 0.0001) return 0;
      return 10000 / wavelength; // Convert μm to cm⁻¹
    }).filter(val => val > 0); // Remove sorting - let Plotly handle axis direction
    
    actualUnit = 'cm⁻¹';
    wasConverted = true;
    conversionInfo = `Converted from micrometers to wavenumbers (cm⁻¹)`;
  }
  
  // Nanometers to Micrometers: λ(μm) = λ(nm) / 1000
  else if ((fromUnitLower.includes('nanometer') || fromUnitLower === 'nm') &&
           (toUnitLower.includes('micrometer') || toUnitLower.includes('micron'))) {
    
    convertedX = xData.map(wavelength => wavelength / 1000);
    actualUnit = 'μm';
    wasConverted = true;
    conversionInfo = `Converted from nanometers to micrometers`;
  }
  
  // Micrometers to Nanometers: λ(nm) = λ(μm) * 1000
  else if ((fromUnitLower.includes('micrometer') || fromUnitLower.includes('micron') || fromUnitLower === 'um') &&
           (toUnitLower.includes('nanometer') || toUnitLower === 'nm')) {
    
    convertedX = xData.map(wavelength => wavelength * 1000);
    actualUnit = 'nm';
    wasConverted = true;
    conversionInfo = `Converted from micrometers to nanometers`;
  }
  
  // Wavenumbers to Micrometers: λ = 10000 / ν
  else if ((fromUnitLower.includes('wavenumber') || fromUnitLower.includes('cm-1') || fromUnitLower.includes('cm^-1')) &&
           (toUnitLower.includes('micrometer') || toUnitLower.includes('micron'))) {
    
    convertedX = xData.map(wavenumber => {
      if (wavenumber <= 0) return 0;
      return 10000 / wavenumber;
    }).filter(val => val > 0); // Remove sorting - maintain original order
    
    actualUnit = 'μm';
    wasConverted = true;
    conversionInfo = `Converted from wavenumbers to micrometers`;
  }
  
  // If no conversion rule matched, return original data
  else {
    convertedX = [...xData];
    actualUnit = fromUnit;
    wasConverted = false;
  }
  
  return {
    convertedX,
    actualUnit,
    wasConverted,
    conversionInfo
  };
}

/**
 * Get the standard x-axis unit for a spectroscopic technique
 * 
 * @param technique Spectroscopic technique
 * @returns Standard unit and label for the technique
 */
export function getStandardXAxisUnit(technique: string): { unit: string; label: string } {
  const techniqueLower = technique.toLowerCase();
  
  switch (techniqueLower) {
    case 'ir':
    case 'infrared':
      return { unit: 'wavenumbers', label: 'Wavenumber (cm⁻¹)' };
    case 'raman':
      return { unit: 'wavenumbers', label: 'Raman Shift (cm⁻¹)' };
    case 'uv-vis':
    case 'uv':
    case 'vis':
      return { unit: 'nanometers', label: 'Wavelength (nm)' };
    case 'libs':
      return { unit: 'nanometers', label: 'Wavelength (nm)' };
    default:
      return { unit: 'unknown', label: 'X-axis' };
  }
}