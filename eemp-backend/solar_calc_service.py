# solar.py
from typing import List

from pvlib.pvsystem import PVSystem, Array, FixedMount
from pvlib.modelchain import ModelChain
from pvlib.location import Location
from pvlib.temperature import TEMPERATURE_MODEL_PARAMETERS
from pvlib.iotools import get_pvgis_tmy, get_pvgis_hourly
import pandas as pd
from solar_models import SolarPanelData, LocationData, WeatherData
from fastapi import Request, HTTPException
from pytz import timezone
import logging
import numpy as np
import pvlib
import math
from datetime import datetime, timezone as dt_timezone

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
        weather_data = weather_data.tz_convert(tz)
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


def get_historical_irradiance(solar_panel_data):
    """
    Fetch historical PVGIS solar irradiance data from 2013-2023.
    Returns a DataFrame indexed by (month, day, hour) with historical irradiance.
    """
    pvgis_results, _, _ = pvlib.iotools.get_pvgis_hourly(
        latitude=solar_panel_data.location.latitude,
        longitude=solar_panel_data.location.longitude,
        start=2013,  # Use past 10 years of data
        end=2023,
        surface_tilt=solar_panel_data.tilt,
        surface_azimuth=solar_panel_data.orientation,
        usehorizon=True,
        components=True,
        map_variables=True
    )

    # Extract relevant columns and group by (month, day, hour) to compute median
    pvgis_results["month"] = pvgis_results.index.month
    pvgis_results["day"] = pvgis_results.index.day
    pvgis_results["hour"] = pvgis_results.index.hour

    # Aggregate median irradiance values for each date/hour combination
    irradiance_median = pvgis_results.groupby(["month", "day", "hour"])[
        ["poa_direct", "poa_sky_diffuse", "poa_ground_diffuse"]
    ].median().reset_index()

    return irradiance_median


def match_irradiance_to_weather(weather_df, irradiance_median):
    """
    Matches weather data in 2025 with median historical irradiance (2013-2023).
    Uses the same month, day, and hour to estimate missing solar data.
    """
    # Extract month, day, and hour from 2025 weather data
    weather_df = weather_df.copy() # to not lose datetime
    weather_df["month"] = weather_df.index.month
    weather_df["day"] = weather_df.index.day
    weather_df["hour"] = weather_df.index.hour

    # Merge historical median irradiance with weather data
    weather_df = weather_df.reset_index().merge(
        irradiance_median, on=["month", "day", "hour"], how="left"
    )

    weather_df.set_index("datetime", inplace=True)


    # Drop helper columns
    weather_df.drop(columns=["month", "day", "hour"], inplace=True)

    return weather_df


def get_solar_declination(day_of_year):
    return 23.44 * np.sin(np.radians((360 / 365) * (day_of_year + 10)))

# Calculate solar noon zenith angle dynamically
def get_max_solar_elevation(latitude, day_of_year):
    declination = get_solar_declination(day_of_year)
    solar_elevation_max = 90 - abs(latitude - declination)  # Max noon solar elevation
    return solar_elevation_max

def calculate_radiation(solar_panel_data: SolarPanelData, weather_df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculates irradiance values (GHI, DHI, DNI) based on historical PVGIS data
    and matches it to the provided weather dataset, adjusting for cloud cover.
    """

    # Step 1: Ensure panel orientation is set correctly
    if solar_panel_data.orientation is None:
        solar_panel_data.orientation = 180.0 if solar_panel_data.location.latitude > 0 else 0.0
        print(f"✅ Auto-set orientation to {solar_panel_data.orientation}° based on latitude {solar_panel_data.location.latitude}")

    # Step 2: Get historical irradiance data
    irradiance_median = get_historical_irradiance(solar_panel_data)

    # Step 3: Match the historical irradiance to 2025 weather data
    weather_df = match_irradiance_to_weather(weather_df, irradiance_median)

    # Step 4: Compute Solar Elevation if Missing
    if "solar_elevation" not in weather_df.columns:
        solpos = pvlib.solarposition.get_solarposition(
            time=weather_df.index,
            latitude=solar_panel_data.location.latitude,
            longitude=solar_panel_data.location.longitude,
            altitude=solar_panel_data.location.altitude
        )
        weather_df["solar_elevation"] = solpos["elevation"]

    # Step 5: Compute Day of Year & Max Solar Elevation
    weather_df["day_of_year"] = weather_df.index.dayofyear
    weather_df["max_solar_elevation"] = weather_df["day_of_year"].apply(
        lambda doy: get_max_solar_elevation(solar_panel_data.location.latitude, doy)
    )

    # Step 6: Convert elevation to zenith angle & cap dynamically
    weather_df["solar_zenith"] = 90 - weather_df["solar_elevation"]
    weather_df["solar_zenith_cap"] = 90 - weather_df["max_solar_elevation"]
    weather_df["solar_zenith"] = weather_df["solar_zenith"].clip(lower=0, upper=weather_df["solar_zenith_cap"])

    # Step 7: Compute Total POA Irradiance
    weather_df["poa_global"] = (
            weather_df["poa_direct"] + weather_df["poa_sky_diffuse"] + weather_df["poa_ground_diffuse"]
    )
    weather_df["poa_global"] = weather_df["poa_global"].clip(lower=0).fillna(0)

    # Step 8: Compute DHI (Diffuse Horizontal Irradiance)
    weather_df["dhi"] = weather_df["poa_sky_diffuse"] + weather_df["poa_ground_diffuse"]
    weather_df["dhi"] = weather_df["dhi"].clip(lower=0).fillna(0)

    # Step 9: Compute DNI (Direct Normal Irradiance)
    cos_zenith = np.cos(np.radians(weather_df["solar_zenith"]))
    cos_zenith = np.maximum(cos_zenith, 0.05)  # Prevent division by zero

    # 🔹 Adjust DNI using exponential attenuation for cloud cover
    cloud_factor = weather_df["cloud_cover"] / 100  # Normalize to 0-1
    dni_factor = np.exp(-cloud_factor * 3)  # Exponential decay for DNI

    weather_df["dni"] = (weather_df["poa_direct"] / cos_zenith) * dni_factor
    weather_df.loc[weather_df["solar_elevation"] <= 5, "dni"] = 0  # Nighttime DNI = 0
    weather_df["dni"] = weather_df["dni"].clip(lower=0).fillna(0)

    # 🔹 Adjust DHI (more cloud cover → more diffuse light)
    dhi_factor = 1 + (cloud_factor * 0.6)
    weather_df["dhi"] *= dhi_factor
    weather_df["dhi"] = weather_df["dhi"].clip(lower=0).fillna(0)

    # Step 10: Compute GHI (Global Horizontal Irradiance)
    weather_df["ghi"] = (weather_df["dni"] * cos_zenith) + weather_df["dhi"]
    weather_df["ghi"] = weather_df["ghi"].clip(lower=0).fillna(0)

    # Step 11: Ensure no NaN values remain
    weather_df.fillna(0, inplace=True)

    # Step 12: Drop unnecessary columns (including cloud cover)
    weather_df.drop(columns=["poa_global", "poa_sky_diffuse", "poa_ground_diffuse", "poa_direct", "solar_elevation",
                             "solar_zenith", "solar_zenith_cap", "day_of_year", "max_solar_elevation", "cloud_cover"], inplace=True)

    return weather_df
