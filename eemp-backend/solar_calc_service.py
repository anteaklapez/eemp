from pvlib import iotools, solarposition
from pvlib.pvsystem import PVSystem, Array, FixedMount
from pvlib.modelchain import ModelChain
from pvlib.location import Location
from pvlib.temperature import TEMPERATURE_MODEL_PARAMETERS
from pvlib.iotools import get_pvgis_tmy
import pandas as pd
from solar_models import SolarPanelData
from location_models import LocationData
from fastapi import Request, HTTPException
import logging
import numpy as np
from datetime import datetime
import asyncio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def calculate_energy(request: Request, solar_panel_data: SolarPanelData, weather_data: pd.DataFrame, location_data: LocationData) -> pd.Series:
    """
    Updated to handle different time resolutions
    """
    # Ensure numeric types
    weather_data = weather_data.apply(pd.to_numeric, errors='coerce')

    # Handle different time resolutions
    if pd.infer_freq(weather_data.index) in ['h', 'd']:
        weather_data = weather_data.asfreq('h').ffill()
    """
    Calculate energy output using PV system modeling.
    Ensures non-negative energy values and handles edge cases.
    """
    # Extract module and inverter datasets
    sandia_modules = request.app.state.sandia_modules
    cec_modules = request.app.state.cec_modules
    cec_inverters = request.app.state.cec_inverters

    # Define location
    location = Location(
        latitude=location_data.latitude,
        longitude=location_data.longitude,
        altitude=location_data.altitude,
        tz=location_data.timezone,
    )

    # Get module parameters
    if solar_panel_data.custom_solar_module:
        module_parameters = solar_panel_data.custom_solar_module.model_dump(exclude={'name'})
    else:
        module_parameters = sandia_modules.get(solar_panel_data.module_name)
        if module_parameters is None:
            module_parameters = cec_modules.get(solar_panel_data.module_name)

    # Validate module parameters
    if isinstance(module_parameters, pd.Series):
        module_parameters = module_parameters.to_dict()
    if not module_parameters or (hasattr(module_parameters, "empty") and module_parameters.empty):
        raise ValueError(f"Module '{solar_panel_data.module_name}' not found or is empty in datasets.")

    # Get inverter parameters
    if solar_panel_data.custom_inverter:
        inverter_parameters = solar_panel_data.custom_inverter.model_dump(exclude={'name'})
    else:
        inverter_parameters = cec_inverters.get(solar_panel_data.inverter_name)

    # Validate inverter parameters
    if isinstance(inverter_parameters, pd.Series):
        inverter_parameters = inverter_parameters.to_dict()
    if not inverter_parameters or (hasattr(inverter_parameters, "empty") and inverter_parameters.empty):
        raise ValueError(f"Inverter '{solar_panel_data.inverter_name}' not found or is empty in datasets.")

    # Get temperature model parameters
    temperature_params = (
        solar_panel_data.custom_temp_model_params.model_dump()
        if solar_panel_data.custom_temp_model_params
        else TEMPERATURE_MODEL_PARAMETERS['sapm']['open_rack_glass_glass']
    )

    # Define PV system
    system = PVSystem(
        arrays=[Array(
            mount=FixedMount(
                surface_tilt=solar_panel_data.tilt,
                surface_azimuth=solar_panel_data.orientation
            ),
            module_parameters=module_parameters,
            temperature_model_parameters=temperature_params
        )],
        inverter_parameters=inverter_parameters
    )

    # Create ModelChain
    mc = ModelChain(system, location, aoi_model='physical', spectral_model='no_loss')

    # Ensure weather data is in the correct timezone
    weather_data = weather_data.tz_convert(location_data.timezone)

    # Run the model
    mc.run_model(weather_data)

    # Extract and clean energy output
    energy_output = pd.Series(mc.results.ac.fillna(0).clip(lower=0).round(2).squeeze(), name="energy_output")

    # Format index to ISO 8601 with timezone
    energy_output.index = energy_output.index.strftime("%Y-%m-%dT%H:%M:%S%z")

    return energy_output


async def calculate_energy_with_tmy(
    request: Request,
    solar_panel_data: SolarPanelData,
    location_data: LocationData
) -> pd.Series:
    """
    Calculate solar energy production using pvlib with TMY data.
    Uses asynchronous processing to fetch and process data concurrently over a 15-year period.
    Returns a Series with 15-year average monthly energy production.
    """
    sandia_modules = request.app.state.sandia_modules
    cec_modules = request.app.state.cec_modules
    cec_inverters = request.app.state.cec_inverters

    current_year = datetime.now().year
    start_year = current_year - 15

    location = Location(
        latitude=location_data.latitude,
        longitude=location_data.longitude,
        altitude=location_data.altitude,
        name=location_data.name,
        tz=location_data.timezone,
    )

    if solar_panel_data.custom_solar_module:
        module_parameters = solar_panel_data.custom_solar_module.model_dump(exclude={'name'})
    elif solar_panel_data.module_name:
        module_parameters = sandia_modules.get(solar_panel_data.module_name) or cec_modules.get(solar_panel_data.module_name)
        if not module_parameters:
            raise ValueError(f"Module '{solar_panel_data.module_name}' not found in datasets.")
    else:
        raise ValueError("Either custom solar module parameters or a valid module name must be provided.")

    if solar_panel_data.custom_inverter:
        inverter_parameters = solar_panel_data.custom_inverter.model_dump(exclude={'name'})
    elif solar_panel_data.inverter_name:
        inverter_parameters = cec_inverters.get(solar_panel_data.inverter_name)
        if not inverter_parameters:
            raise ValueError(f"Inverter '{solar_panel_data.inverter_name}' not found in datasets.")
    else:
        raise ValueError("Either custom inverter parameters or a valid inverter name must be provided.")

    temperature_params = (
        solar_panel_data.custom_temp_model_params.model_dump()
        if solar_panel_data.custom_temp_model_params
        else TEMPERATURE_MODEL_PARAMETERS['sapm']['open_rack_glass_glass']
    )

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

    def process_year(year: int) -> pd.Series:
        try:
            logger.info(f"Fetching TMY data for year {year}...")
            df, metadata, status, headers = get_pvgis_tmy(
                latitude=location_data.latitude,
                longitude=location_data.longitude,
                outputformat='json',
                coerce_year=year,
                usehorizon=True,
                map_variables=True
            )
            logger.info(f"TMY data fetched successfully for {year}.")
            weather_df = df.copy()

            mc_year = ModelChain(system, location, aoi_model='physical', spectral_model='no_loss')
            mc_year.run_model(weather_df)

            ac_output = mc_year.results.ac
            if ac_output is None:
                raise ValueError("AC output is missing from the model results.")
            # Resample to monthly sums using end-of-month frequency.
            monthly_energy = ac_output.resample('ME').sum()
            return monthly_energy
        except Exception as e:
            logger.error(f"Error processing TMY data for year {year}: {e}")
            raise e

    years = list(range(start_year, current_year + 1))
    tasks = [asyncio.to_thread(process_year, year) for year in years]
    try:
        monthly_outputs = await asyncio.gather(*tasks)
    except Exception as e:
        logger.error(f"Error fetching TMY data: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch TMY data.")

    if not monthly_outputs:
        raise ValueError("No valid TMY data available for the 15-year range.")

    combined_monthly = pd.concat(monthly_outputs, axis=1).mean(axis=1)

    combined_monthly.index = combined_monthly.index.strftime('%B')
    combined_monthly.name = f"15-Year Average Monthly Energy Production ({location.name})"

    return combined_monthly


# Helper function: Get solar declination (for max solar elevation)
def get_solar_declination(day_of_year_array: np.ndarray) -> np.ndarray:
    """Calculate solar declination for given day of year."""
    return 23.44 * np.sin(np.radians((360 / 365) * (day_of_year_array - 81)))

# Helper function: Get max solar elevation
def get_max_solar_elevation_vectorized(latitude: float, day_of_year_array: np.ndarray) -> np.ndarray:
    """Calculate max solar elevation for given latitude and day of year."""
    declination = get_solar_declination(day_of_year_array)
    return 90 - np.abs(latitude - declination)

# Fetch historical PVGIS data
def get_historical_irradiance(solar_panel_data, location) -> pd.DataFrame:
    """
    Fetch historical PVGIS solar irradiance data from 2013-2023.
    Returns a DataFrame indexed by (month, day, hour) with historical irradiance.
    """
    pvgis_results, _, _ = iotools.get_pvgis_hourly(
        latitude=location.latitude,
        longitude=location.longitude,
        start=2013,
        end=2023,
        surface_tilt=solar_panel_data.tilt,
        surface_azimuth=solar_panel_data.orientation,
        usehorizon=True,
        components=True,
        map_variables=True
    )

    # Add month, day, hour for grouping
    idx = pvgis_results.index
    pvgis_results = pvgis_results.assign(
        month=idx.month,
        day=idx.day,
        hour=idx.hour
    )

    # Calculate median irradiance for each time of year
    irradiance_median = (
        pvgis_results.groupby(["month", "day", "hour"])[["poa_direct", "poa_sky_diffuse", "poa_ground_diffuse"]]
        .median()
        .reset_index()
    )
    return irradiance_median

# Match historical irradiance to weather data
def match_irradiance_to_weather(weather_df: pd.DataFrame, irradiance_median: pd.DataFrame) -> pd.DataFrame:
    """
    Matches weather data with median historical irradiance by merging on month, day, and hour.
    """
    idx = weather_df.index
    weather_df = weather_df.copy()  # Avoid modifying the original
    weather_df = weather_df.assign(
        month=idx.month,
        day=idx.day,
        hour=idx.hour
    )

    # Merge with historical irradiance
    weather_df = weather_df.reset_index().merge(
        irradiance_median, on=["month", "day", "hour"], how="left"
    )

    # Restore datetime index
    weather_df.set_index("datetime", inplace=True)
    weather_df.drop(columns=["month", "day", "hour"], inplace=True)
    return weather_df

# Main function: Calculate radiation components
def calculate_radiation(solar_panel_data, weather_df: pd.DataFrame, location: LocationData) -> pd.DataFrame:
    """
    Calculates irradiance values (GHI, DHI, DNI) based on historical PVGIS data,
    matching it to the provided weather dataset and adjusting for cloud cover.
    Returns a DataFrame with columns 'dni', 'dhi', and 'ghi'.
    """
    # Ensure orientation is set
    if solar_panel_data.orientation is None:
        solar_panel_data.orientation = 180.0 if location.latitude > 0 else 0.0
        print(f"✅ Auto-set orientation to {solar_panel_data.orientation}° based on latitude {location.latitude}")

    if 'cloud_cover' not in weather_df.columns:
        weather_df['cloud_cover'] = 0

    # Fetch and match historical irradiance
    irradiance_median = get_historical_irradiance(solar_panel_data, location)
    weather_df = match_irradiance_to_weather(weather_df, irradiance_median)

    # Calculate solar position
    solpos = solarposition.get_solarposition(
        time=weather_df.index,
        latitude=location.latitude,
        longitude=location.longitude,
        altitude=location.altitude
    )
    weather_df["solar_elevation"] = solpos["elevation"]
    weather_df["solar_zenith"] = solpos["zenith"]

    # Calculate max solar elevation
    day_of_year = weather_df.index.dayofyear.values
    weather_df["max_solar_elevation"] = get_max_solar_elevation_vectorized(
        location.latitude, day_of_year
    )

    # Clip solar zenith to avoid extreme values
    weather_df["solar_zenith"] = weather_df["solar_zenith"].clip(lower=0, upper=90)

    # Convert POA irradiance to horizontal components
    cos_zenith = np.cos(np.radians(weather_df["solar_zenith"]))
    weather_df["dni"] = weather_df["poa_direct"] / cos_zenith
    weather_df["dhi"] = weather_df["poa_sky_diffuse"] + weather_df["poa_ground_diffuse"]

    # Adjust for cloud cover
    cloud_factor = weather_df["cloud_cover"] / 100  # 0 to 1
    weather_df["dni"] *= np.exp(-cloud_factor * 3)  # Exponential decay
    weather_df["dhi"] *= (1 + cloud_factor * 0.6)  # Increase diffuse under clouds

    # Calculate GHI
    weather_df["ghi"] = (weather_df["dni"] * cos_zenith) + weather_df["dhi"]

    # Nighttime handling
    mask_night = weather_df["solar_elevation"] <= 0
    weather_df.loc[mask_night, ["dni", "dhi", "ghi"]] = 0

    # Cleanup
    cols_to_drop = [
        "poa_direct", "poa_sky_diffuse", "poa_ground_diffuse",
        "solar_elevation", "max_solar_elevation", "cloud_cover"
    ]
    weather_df.drop(columns=cols_to_drop, inplace=True)

    return weather_df[['temperature', 'dni', 'dhi', 'ghi']]
