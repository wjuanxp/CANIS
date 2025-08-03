import csv
import hashlib
import numpy as np
from typing import Tuple, List, Dict, Any, Optional
from io import StringIO
import jcamp


class SpectralFileParser:
    """Utility class for parsing different spectral file formats"""
    
    @staticmethod
    def calculate_file_hash(content: bytes) -> str:
        """Calculate SHA-256 hash of file content"""
        return hashlib.sha256(content).hexdigest()
    
    @staticmethod
    def parse_csv_spectrum(content: str, filename: str) -> Tuple[List[float], List[float], Dict[str, Any]]:
        """
        Parse CSV file with wavelength,intensity pairs
        Expected format: wavelength,intensity (with optional header)
        """
        lines = content.strip().split('\n')
        if not lines:
            raise ValueError("Empty CSV file")
        
        # Check if first line is a header
        first_line = lines[0].strip()
        try:
            # Try to parse first line as numbers
            values = first_line.split(',')
            float(values[0])
            float(values[1])
            has_header = False
        except (ValueError, IndexError):
            has_header = True
        
        # Parse data
        wavelengths = []
        intensities = []
        start_idx = 1 if has_header else 0
        
        for i, line in enumerate(lines[start_idx:], start_idx + 1):
            line = line.strip()
            if not line:
                continue
            
            try:
                parts = line.split(',')
                if len(parts) < 2:
                    raise ValueError(f"Invalid format at line {i}: expected wavelength,intensity")
                
                wavelength = float(parts[0])
                intensity = float(parts[1])
                
                wavelengths.append(wavelength)
                intensities.append(intensity)
            except ValueError as e:
                raise ValueError(f"Error parsing line {i}: {e}")
        
        if not wavelengths:
            raise ValueError("No valid data points found in CSV file")
        
        # Determine technique based on wavelength range
        technique = SpectralFileParser._determine_technique_from_wavelengths(wavelengths)
        
        metadata = {
            "original_format": "CSV",
            "data_points": len(wavelengths),
            "wavelength_range": [min(wavelengths), max(wavelengths)],
            "has_header": has_header
        }
        
        return wavelengths, intensities, metadata
    
    @staticmethod
    def parse_jcamp_spectrum(content: str, filename: str) -> Tuple[List[float], List[float], Dict[str, Any]]:
        """Parse JCAMP-DX format spectral file"""
        try:
            # Parse JCAMP data
            jcamp_data = jcamp.jcamp_read(StringIO(content))
            
            # Extract wavelengths/wavenumbers and intensities
            x_data = jcamp_data.get('x', [])
            y_data = jcamp_data.get('y', [])
            
            # Handle the case where x_data or y_data might be numpy arrays or empty
            x_empty = len(x_data) == 0 if hasattr(x_data, '__len__') else not x_data
            y_empty = len(y_data) == 0 if hasattr(y_data, '__len__') else not y_data
            
            if x_empty or y_empty:
                raise ValueError("No spectral data found in JCAMP file")
            
            # Convert to lists if numpy arrays
            wavelengths = x_data.tolist() if hasattr(x_data, 'tolist') else list(x_data)
            intensities = y_data.tolist() if hasattr(y_data, 'tolist') else list(y_data)
            
            # Determine technique from JCAMP metadata or wavelength range
            technique = None
            if 'title' in jcamp_data:
                title = jcamp_data['title'].upper()
                if 'IR' in title or 'INFRARED' in title:
                    technique = 'IR'
                elif 'RAMAN' in title:
                    technique = 'Raman'
                elif 'UV' in title or 'VIS' in title:
                    technique = 'UV-Vis'
            
            if not technique:
                technique = SpectralFileParser._determine_technique_from_wavelengths(wavelengths)
            
            # Extract metadata
            metadata = {
                "original_format": "JCAMP-DX",
                "data_points": len(wavelengths),
                "wavelength_range": [min(wavelengths), max(wavelengths)],
                "jcamp_version": jcamp_data.get('jcamp_version', 'Unknown'),
                "title": jcamp_data.get('title', ''),
                "origin": jcamp_data.get('origin', ''),
                "owner": jcamp_data.get('owner', ''),
                "xunits": jcamp_data.get('xunits', ''),
                "yunits": jcamp_data.get('yunits', ''),
            }
            
            return wavelengths, intensities, metadata
            
        except Exception as e:
            raise ValueError(f"Error parsing JCAMP file: {str(e)}")
    
    @staticmethod
    def _determine_technique_from_wavelengths(wavelengths: List[float]) -> str:
        """Determine spectroscopic technique based on wavelength range"""
        if not wavelengths:
            return "Unknown"
        
        # Convert to numpy array if it isn't already, then get scalar values
        wavelengths_array = np.array(wavelengths)
        min_wl = float(np.min(wavelengths_array))
        max_wl = float(np.max(wavelengths_array))
        
        # UV-Vis: typically 200-800 nm
        if 200 <= min_wl and max_wl <= 1000:
            return "UV-Vis"
        
        # IR: typically 4000-400 cm⁻¹ (wavenumbers)
        if 400 <= min_wl and max_wl <= 4000:
            return "IR"
        
        # Near-IR: typically 800-2500 nm
        if 800 <= min_wl and max_wl <= 3000:
            return "Near-IR"
        
        # If range suggests Raman shifts (typically 0-4000 cm⁻¹)
        if 0 <= min_wl and max_wl <= 4000 and min_wl >= 0:
            return "Raman"
        
        return "Unknown"
    
    @staticmethod
    def parse_spectrum_file(content: bytes, filename: str) -> Tuple[List[float], List[float], Dict[str, Any], str]:
        """
        Main entry point for parsing spectral files
        Returns: (wavelengths, intensities, metadata, technique)
        """
        # Calculate file hash
        file_hash = SpectralFileParser.calculate_file_hash(content)
        
        # Decode content
        try:
            text_content = content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                text_content = content.decode('latin-1')
            except UnicodeDecodeError:
                raise ValueError("Unable to decode file content")
        
        # Determine file format from extension
        filename_lower = filename.lower()
        
        if filename_lower.endswith('.csv'):
            wavelengths, intensities, metadata = SpectralFileParser.parse_csv_spectrum(text_content, filename)
        elif filename_lower.endswith(('.dx', '.jdx', '.jcamp')):
            wavelengths, intensities, metadata = SpectralFileParser.parse_jcamp_spectrum(text_content, filename)
        else:
            # Try to auto-detect format
            if text_content.strip().startswith('##'):
                # Looks like JCAMP
                wavelengths, intensities, metadata = SpectralFileParser.parse_jcamp_spectrum(text_content, filename)
            else:
                # Try CSV format
                wavelengths, intensities, metadata = SpectralFileParser.parse_csv_spectrum(text_content, filename)
        
        # Add file hash to metadata
        metadata['file_hash'] = file_hash
        
        # Determine technique
        technique = metadata.get('technique') or SpectralFileParser._determine_technique_from_wavelengths(wavelengths)
        
        return wavelengths, intensities, metadata, technique