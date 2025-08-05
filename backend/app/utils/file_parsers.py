import csv
import hashlib
import numpy as np
from typing import Tuple, List, Dict, Any, Optional
from io import StringIO
import jcamp
import logging

logger = logging.getLogger(__name__)


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
        
        # Do not determine technique for CSV files - metadata-only detection
        metadata = {
            "original_format": "CSV",
            "data_points": len(wavelengths),
            "wavelength_range": [min(wavelengths), max(wavelengths)],
            "has_header": has_header,
            "technique": "Unknown"  # CSV files don't have metadata to determine technique
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
            
            # Add filename to jcamp_data for filename-based detection
            jcamp_data['_filename'] = filename
            
            # Determine technique from JCAMP metadata
            technique = SpectralFileParser._determine_technique_from_jcamp_metadata(jcamp_data)
            
            # Log debugging information - print all available keys first
            logger.info(f"JCAMP file '{filename}' - All available metadata keys:")
            for key in sorted(jcamp_data.keys()):
                logger.info(f"  '{key}': {jcamp_data[key]}")
            
            logger.info(f"JCAMP file '{filename}' metadata analysis:")
            logger.info(f"  Data Type: {jcamp_data.get('datatype', jcamp_data.get('data type', 'Not found'))}")
            logger.info(f"  Title: {jcamp_data.get('title', 'Not found')}")
            logger.info(f"  X Units: {jcamp_data.get('xunits', 'Not found')}")
            logger.info(f"  Y Units: {jcamp_data.get('yunits', 'Not found')}")
            logger.info(f"  Origin: {jcamp_data.get('origin', 'Not found')}")
            logger.info(f"  Detected technique: {technique}")
            
            # Also print to console for immediate debugging
            print(f"JCAMP file '{filename}' - All available metadata keys:")
            for key in sorted(jcamp_data.keys()):
                print(f"  '{key}': {jcamp_data[key]}")
            print(f"Detected technique: {technique}")
            
            # Do not fall back to wavelength range analysis - removed as per user requirements
            # Keep technique as "Unknown" if metadata doesn't provide clear indication
            
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
                "datatype": jcamp_data.get('datatype', jcamp_data.get('data type', '')),
                "spectrometer": jcamp_data.get('spectrometer', ''),
                "instrument": jcamp_data.get('instrument', ''),
                "data_processing": jcamp_data.get('data_processing', ''),
                "sample_description": jcamp_data.get('sample_description', ''),
                "cas_registry_no": jcamp_data.get('cas_registry_no', ''),
                "molform": jcamp_data.get('molform', ''),
                "date": jcamp_data.get('date', ''),
                "time": jcamp_data.get('time', ''),
                "resolution": jcamp_data.get('resolution', ''),
                "detector": jcamp_data.get('detector', ''),
                "source": jcamp_data.get('source', ''),
                "technique": technique  # Store the detected technique in metadata
            }
            
            return wavelengths, intensities, metadata
            
        except Exception as e:
            raise ValueError(f"Error parsing JCAMP file: {str(e)}")
    
    @staticmethod
    def _determine_technique_from_jcamp_metadata(jcamp_data: Dict[str, Any]) -> str:
        """
        Determine spectroscopic technique from JCAMP-DX metadata fields
        Priority order:
        1. ##DATA TYPE= field (various possible names including ## prefix)
        2. ##TITLE= field analysis
        3. ##XUNITS= and ##YUNITS= field analysis
        4. Other metadata fields
        """
        # Check DATA TYPE field first (most reliable) - try multiple possible field names including ## prefix
        data_type_fields = [
            'data type', 'DATA TYPE', 'datatype', 'DATATYPE', 'data_type', 'DATA_TYPE',
            '##data type', '##DATA TYPE', '##datatype', '##DATATYPE', '##data_type', '##DATA_TYPE'
        ]
        data_type = ''
        
        for field in data_type_fields:
            if field in jcamp_data:
                data_type = str(jcamp_data[field]).upper()
                break
        
        if data_type:
            print(f"Found DATA TYPE field: '{data_type}'")
            if any(keyword in data_type for keyword in ['INFRARED', 'IR SPECTRUM', 'FTIR']):
                return 'IR'
            elif 'RAMAN' in data_type:
                return 'Raman'
            elif any(keyword in data_type for keyword in ['ULTRAVIOLET', 'UV', 'VISIBLE', 'UV/VIS']):
                return 'UV-Vis'
            elif any(keyword in data_type for keyword in ['MASS', 'MS']):
                return 'MS'
            elif 'NMR' in data_type:
                return 'NMR'
        
        # Check title field - try multiple possible title field names including ## prefix
        title_fields = [
            'title', 'TITLE', 'Title', 
            '##title', '##TITLE', '##Title'
        ]
        title = ''
        
        for field in title_fields:
            if field in jcamp_data:
                title = str(jcamp_data[field]).upper()
                break
        
        if title:
            print(f"Found TITLE field: '{title}'")
            # Look for explicit technique mentions
            if any(keyword in title for keyword in ['IR SPECTRUM', 'INFRARED', 'FTIR', ' IR ']):
                return 'IR'
            elif 'RAMAN' in title:
                return 'Raman'
            elif any(keyword in title for keyword in ['UV', 'VISIBLE', 'UV-VIS', 'ABSORPTION']):
                return 'UV-Vis'
            elif 'LIBS' in title:
                return 'LIBS'
            elif any(keyword in title for keyword in ['XRF', 'X-RAY']):
                return 'XRF'
        
        # Check units for additional clues - try with and without ## prefix
        xunits_fields = ['xunits', 'XUNITS', '##xunits', '##XUNITS']
        yunits_fields = ['yunits', 'YUNITS', '##yunits', '##YUNITS']
        
        xunits = ''
        for field in xunits_fields:
            if field in jcamp_data:
                xunits = str(jcamp_data[field]).upper()
                break
                
        yunits = ''
        for field in yunits_fields:
            if field in jcamp_data:
                yunits = str(jcamp_data[field]).upper()
                break
        
        if xunits:
            # Wavenumber units (cm⁻¹) with transmittance/absorbance suggests IR
            if any(unit in xunits for unit in ['1/CM', 'CM-1', 'CM^-1', 'WAVENUMBER']):
                if any(unit in yunits for unit in ['TRANSMITTANCE', 'ABSORBANCE', '%T']):
                    return 'IR'
                elif any(unit in yunits for unit in ['INTENSITY', 'COUNTS', 'ARBITRARY']):
                    # Could be Raman or IR, need more context
                    # Check if title or data type gives more clues
                    if 'RAMAN' in title:
                        return 'Raman'
                    # Default to IR for transmittance/absorbance units
                    return 'IR'
            
            # Wavelength units (nm) typically indicate UV-Vis or LIBS
            elif any(unit in xunits for unit in ['NM', 'NANOMETER']):
                if any(unit in yunits for unit in ['ABSORBANCE', 'TRANSMITTANCE']):
                    return 'UV-Vis'
                elif any(unit in yunits for unit in ['INTENSITY', 'COUNTS']):
                    return 'LIBS'
        
        # Check origin field for instrument-specific clues - try with and without ## prefix
        origin_fields = ['origin', 'ORIGIN', '##origin', '##ORIGIN']
        origin = ''
        for field in origin_fields:
            if field in jcamp_data:
                origin = str(jcamp_data[field]).upper()
                break
                
        if origin:
            if any(keyword in origin for keyword in ['FTIR', 'INFRARED']):
                return 'IR'
            elif 'RAMAN' in origin:
                return 'Raman'
            elif any(keyword in origin for keyword in ['UV', 'VISIBLE']):
                return 'UV-Vis'
        
        # Check filename as a last resort fallback
        # This handles cases like "108-95-2-IR.jdx" where metadata might be missing
        filename_upper = str(jcamp_data.get('_filename', '')).upper()
        if filename_upper:
            if any(keyword in filename_upper for keyword in ['-IR.', '_IR.', 'IR-', 'IR_', 'INFRARED']):
                print(f"Detected IR from filename: {filename_upper}")
                return 'IR'
            elif any(keyword in filename_upper for keyword in ['-RAMAN.', '_RAMAN.', 'RAMAN-', 'RAMAN_']):
                print(f"Detected Raman from filename: {filename_upper}")
                return 'Raman'
            elif any(keyword in filename_upper for keyword in ['-UV.', '_UV.', 'UV-', 'UV_', '-VIS.', '_VIS.']):
                print(f"Detected UV-Vis from filename: {filename_upper}")
                return 'UV-Vis'
        
        return "Unknown"
    
    @staticmethod
    def _determine_technique_from_wavelengths(wavelengths: List[float]) -> str:
        """DEPRECATED: Do not use wavelength-based technique detection"""
        # This method has been deprecated as per user requirements
        # Always return Unknown to force metadata-based detection only
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
        
        # Get technique from metadata if available (JCAMP files store it there)
        technique = metadata.get('technique', 'Unknown')
        
        return wavelengths, intensities, metadata, technique