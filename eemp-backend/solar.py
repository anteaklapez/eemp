from pvlib.pvsystem import PVSystem, Array, FixedMount
from pvlib.modelchain import ModelChain
from pvlib.location import Location
from pvlib.temperature import TEMPERATURE_MODEL_PARAMETERS
import pandas as pd
from models import SolarPanelData
from fastapi import Request
from pytz import timezone


async def calculate_energy(
    request: Request,
    solar_panel_data: SolarPanelData,
    weather_data: pd.DataFrame
) -> pd.Series:
    """
    Calculate solar energy production using pvlib.

    Args:
        request (Request): The FastAPI request object to access application state.
        solar_panel_data (SolarPanelData): User input data for the solar panel system.
        weather_data (pd.DataFrame): Weather data including GHI, DNI, temperature, etc.

    Returns:
        pd.Series: Hourly or daily energy production as a pandas Series.
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
    mc = ModelChain(system, location, dc_model='pvwatts', ac_model='pvwatts', aoi_model='physical', spectral_model='no_loss')

    # 7. Localize weather data to the specified timezone
    tz = timezone(solar_panel_data.location.timezone)
    try:
        weather_data = weather_data.tz_localize(tz, nonexistent='shift_forward', ambiguous='infer')
    except Exception as e:
        raise ValueError(f"Error localizing timezone: {e}")

    # 8. Run the Model
    mc.run_model(weather_data)

    # 9. Energy Production (AC Output)
    energy_output = mc.results.ac

    return energy_output
