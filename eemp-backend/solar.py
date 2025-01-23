# solar.py

from pvlib.pvsystem import PVSystem, Array, FixedMount
from pvlib.modelchain import ModelChain
from pvlib.location import Location
from pvlib.temperature import TEMPERATURE_MODEL_PARAMETERS
from pvlib.iotools import get_pvgis_tmy
import pandas as pd
from solar_models import SolarPanelData
from fastapi import Request, HTTPException
from pytz import timezone
from datetime import datetime
import pytz
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def calculate_energy(
    request: Request,
    solar_panel_data: SolarPanelData,
    weather_data: pd.DataFrame
) -> pd.Series:
    """
    Calculate solar energy production using pvlib with user-provided weather data.
    """
    # Retrieve datasets from application state
    sandia_modules = request.app.state.sandia_modules
    cec_modules = request.app.state.cec_modules
    cec_inverters = request.app.state.cec_inverters

    # 1. Location Setup
    location = Location(
        latitude=solar_panel_data.location.latitude,
        longitude=solar_panel_data.location.longitude,
        altitude=solar_panel_data.location.altitude,
        tz=solar_panel_data.location.timezone,
    )

    # 2. Module Parameters
    if solar_panel_data.custom_solar_module:
        module_parameters = solar_panel_data.custom_solar_module.model_dump(exclude={'name'})
    else:
        raise ValueError("Custom solar module parameters are required.")

    # 3. Inverter Parameters
    if solar_panel_data.custom_inverter:
        inverter_parameters = solar_panel_data.custom_inverter.model_dump(exclude={'name'})
        inverter_parameters.pop('name', None)  # Remove 'name' if present
    else:
        raise ValueError("Custom inverter parameters are required.")

    # 4. Temperature Model Parameters
    if solar_panel_data.custom_temp_model_params:
        temperature_params = solar_panel_data.custom_temp_model_params.model_dump()
    else:
        # Use default temperature model parameters
        temperature_params = TEMPERATURE_MODEL_PARAMETERS['sapm']['open_rack_glass_glass']

    # 5. Create PVSystem
    mount = FixedMount(
        surface_tilt=solar_panel_data.tilt,
        surface_azimuth=solar_panel_data.orientation
    )
    array = Array(
        mount=mount,
        module_parameters=module_parameters,
        temperature_model_parameters=temperature_params
    )
    system = PVSystem(
        arrays=[array],
        inverter_parameters=inverter_parameters
    )

    # 6. Model Chain Setup
    mc = ModelChain(system, location, temperature_model='sapm', aoi_model='physical', spectral_model='no_loss')

    # 7. Localize weather data to the specified timezone
    tz = timezone(solar_panel_data.location.timezone)
    try:
        weather_data = weather_data.tz_localize('UTC').tz_convert(tz)
    except Exception as e:
        raise ValueError(f"Error localizing timezone: {e}")

    # 8. Run the Model
    mc.run_model(weather_data)

    # 9. Energy Production (AC Output)
    energy_output = mc.results.ac

    return energy_output

async def calculate_energy_with_tmy(
    request: Request,
    solar_panel_data: SolarPanelData
) -> pd.Series:
    """
    Calculate solar energy production using pvlib with TMY data.
    """
    # Retrieve datasets from application state
    sandia_modules = request.app.state.sandia_modules
    cec_modules = request.app.state.cec_modules
    cec_inverters = request.app.state.cec_inverters

    # 1. Location Setup
    location = Location(
        latitude=solar_panel_data.location.latitude,
        longitude=solar_panel_data.location.longitude,
        altitude=solar_panel_data.location.altitude,
        name=solar_panel_data.location.name,
        tz=solar_panel_data.location.timezone,
    )

    # 2. Module Parameters
    if solar_panel_data.custom_solar_module:
        module_parameters = solar_panel_data.custom_solar_module.model_dump(exclude={'name'})
    else:
        raise ValueError("Custom solar module parameters are required.")

    # 3. Inverter Parameters
    if solar_panel_data.custom_inverter:
        inverter_parameters = solar_panel_data.custom_inverter.model_dump(exclude={'name'})
        inverter_parameters.pop('name', None)  # Remove 'name' if present
    else:
        raise ValueError("Custom inverter parameters are required.")

    # 4. Temperature Model Parameters
    if solar_panel_data.custom_temp_model_params:
        temperature_params = solar_panel_data.custom_temp_model_params.model_dump()
    else:
        # Use default temperature model parameters
        temperature_params = TEMPERATURE_MODEL_PARAMETERS['sapm']['open_rack_glass_glass']

    # 5. Create PVSystem
    mount = FixedMount(
        surface_tilt=solar_panel_data.tilt,
        surface_azimuth=solar_panel_data.orientation
    )
    array = Array(
        mount=mount,
        module_parameters=module_parameters,
        temperature_model_parameters=temperature_params
    )
    system = PVSystem(
        arrays=[array],
        inverter_parameters=inverter_parameters
    )

    # 6. Model Chain Setup
    mc = ModelChain(system, location, aoi_model='physical', spectral_model='no_loss')

    # 7. Fetch TMY Data using pvlib's PVGIS interface
    try:
        logger.info("Fetching TMY data...")
        df, metadata, status, headers = get_pvgis_tmy(
            latitude=solar_panel_data.location.latitude,
            longitude=solar_panel_data.location.longitude,
            coerce_year=2022,
            outputformat='json',
            usehorizon=True,
            map_variables=True
        )
        logger.info("TMY data fetched successfully." + str(df))
    except Exception as e:
        logger.error(f"Error fetching TMY data: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch TMY data.")

    # 8. Convert TMY Data to DataFrame
    weather_df = df.copy()


    # 11. Run the Model
    mc.run_model(weather_df)

    # 12. Energy Production (AC Output)
    annual_energy = mc.results.ac.sum()

    energies = {}
    energies = pd.Series(energies)
    energies[location.name] = annual_energy

    return energies
