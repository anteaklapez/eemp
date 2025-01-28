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
import logging
from datetime import datetime

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
    sandia_modules = request.app.state.sandia_modules
    cec_modules = request.app.state.cec_modules
    cec_inverters = request.app.state.cec_inverters

    location = Location(
        latitude=solar_panel_data.location.latitude,
        longitude=solar_panel_data.location.longitude,
        altitude=solar_panel_data.location.altitude,
        tz=solar_panel_data.location.timezone,
    )

    if solar_panel_data.custom_solar_module:
        module_parameters = solar_panel_data.custom_solar_module.model_dump(exclude={'name'})
    elif solar_panel_data.module_name:  # Load from predefined modules
        if solar_panel_data.module_name in sandia_modules:
            module_parameters = sandia_modules[solar_panel_data.module_name]
        elif solar_panel_data.module_name in cec_modules:
            module_parameters = cec_modules[solar_panel_data.module_name]
        else:
            raise ValueError(f"Module '{solar_panel_data.module_name}' not found in datasets.")
    else:
        raise ValueError("Either custom solar module parameters or a valid module name must be provided.")

    if solar_panel_data.custom_inverter:
        inverter_parameters = solar_panel_data.custom_inverter.model_dump(exclude={'name'})
    elif solar_panel_data.inverter_name:  # Load from predefined inverters
        if solar_panel_data.inverter_name in cec_inverters:
            inverter_parameters = cec_inverters[solar_panel_data.inverter_name]
        else:
            raise ValueError(f"Inverter '{solar_panel_data.inverter_name}' not found in datasets.")
    else:
        raise ValueError("Either custom inverter parameters or a valid inverter name must be provided.")

    if solar_panel_data.custom_temp_model_params:
        temperature_params = solar_panel_data.custom_temp_model_params.model_dump()
    else:
        temperature_params = TEMPERATURE_MODEL_PARAMETERS['sapm']['open_rack_glass_glass']

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

    mc = ModelChain(system, location, aoi_model='physical', spectral_model='no_loss')

    tz = timezone(solar_panel_data.location.timezone)
    try:
        weather_data = weather_data.tz_localize('UTC').tz_convert(tz)
    except Exception as e:
        raise ValueError(f"Error localizing timezone: {e}")

    mc.run_model(weather_data)

    energy_output = mc.results.ac

    return energy_output


async def calculate_energy_with_tmy(
    request: Request,
    solar_panel_data: SolarPanelData
) -> pd.Series:
    """
    Calculate solar energy production using pvlib with TMY data.
    """
    sandia_modules = request.app.state.sandia_modules
    cec_modules = request.app.state.cec_modules
    cec_inverters = request.app.state.cec_inverters

    current_year = datetime.now().year
    start_year = current_year - 15

    location = Location(
        latitude=solar_panel_data.location.latitude,
        longitude=solar_panel_data.location.longitude,
        altitude=solar_panel_data.location.altitude,
        name=solar_panel_data.location.name,
        tz=solar_panel_data.location.timezone,
    )

    if solar_panel_data.custom_solar_module:
        module_parameters = solar_panel_data.custom_solar_module.model_dump(exclude={'name'})
    elif solar_panel_data.module_name:  # Load from predefined modules
        if solar_panel_data.module_name in sandia_modules:
            module_parameters = sandia_modules[solar_panel_data.module_name]
        elif solar_panel_data.module_name in cec_modules:
            module_parameters = cec_modules[solar_panel_data.module_name]
        else:
            raise ValueError(f"Module '{solar_panel_data.module_name}' not found in datasets.")
    else:
        raise ValueError("Either custom solar module parameters or a valid module name must be provided.")

    if solar_panel_data.custom_inverter:
        inverter_parameters = solar_panel_data.custom_inverter.model_dump(exclude={'name'})
    elif solar_panel_data.inverter_name:  # Load from predefined inverters
        if solar_panel_data.inverter_name in cec_inverters:
            inverter_parameters = cec_inverters[solar_panel_data.inverter_name]
        else:
            raise ValueError(f"Inverter '{solar_panel_data.inverter_name}' not found in datasets.")
    else:
        raise ValueError("Either custom inverter parameters or a valid inverter name must be provided.")

    if solar_panel_data.custom_temp_model_params:
        temperature_params = solar_panel_data.custom_temp_model_params.model_dump()
    else:
        temperature_params = TEMPERATURE_MODEL_PARAMETERS['sapm']['open_rack_glass_glass']

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

    mc = ModelChain(system, location, aoi_model='physical', spectral_model='no_loss')

    monthly_outputs = []

    for year in range(start_year, current_year + 1):
        try:
            logger.info("Fetching TMY data...")
            df, metadata, status, headers = get_pvgis_tmy(
                latitude=solar_panel_data.location.latitude,
                longitude=solar_panel_data.location.longitude,
                outputformat='json',
                coerce_year=year,
                usehorizon=True,
                map_variables=True
            )
            logger.info("TMY data fetched successfully.")

            weather_df = df.copy()
            mc.run_model(weather_df)

            ac_output = mc.results.ac

            if ac_output is None:
                raise ValueError("AC output is missing from the model results.")

            # Group by month and sum the AC output
            monthly_energy = ac_output.resample('ME').sum()
            monthly_outputs.append(monthly_energy)


        except Exception as e:
            logger.error(f"Error fetching TMY data: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch TMY data.")

    if not monthly_outputs:
        raise ValueError("No valid TMY data available for the 15-year range.")

    combined_monthly = pd.concat(monthly_outputs, axis=1).mean(axis=1)
    combined_monthly.index = combined_monthly.index.strftime('%B')  # Format index as month names
    combined_monthly.name = f"15-Year Average Monthly Energy Production ({location.name})"

    return combined_monthly



