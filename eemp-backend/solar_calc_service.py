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
import functools

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def calculate_energy(request: Request, solar_panel_data: SolarPanelData, weather_data: pd.DataFrame,
                           location_data: LocationData) -> pd.Series:
    """
    Calculate energy output using PV system modeling.
    Ensures non-negative energy values and handles edge cases.
    """

    weather_data = weather_data.apply(pd.to_numeric, errors='coerce')


    if pd.infer_freq(weather_data.index) in ['h', 'd']:
        weather_data = weather_data.asfreq('h').ffill()


    latitude = location_data.latitude
    longitude = location_data.longitude
    timezone = location_data.timezone
    altitude = location_data.altitude


    location = Location(
        latitude=latitude,
        longitude=longitude,
        altitude=altitude,
        tz=timezone,
    )


    sandia_modules = request.app.state.sandia_modules
    cec_modules = request.app.state.cec_modules
    cec_inverters = request.app.state.cec_inverters


    if solar_panel_data.custom_solar_module:
        module_parameters = solar_panel_data.custom_solar_module.model_dump(exclude={'name'})
    else:

        module_parameters = sandia_modules.get(solar_panel_data.module_name)
        print(solar_panel_data)
        if module_parameters is None:
            module_parameters = cec_modules.get(solar_panel_data.module_name)


    if isinstance(module_parameters, pd.Series):
        module_parameters = module_parameters.to_dict()
    if not module_parameters or (hasattr(module_parameters, "empty") and module_parameters.empty):
        raise ValueError(f"Module '{solar_panel_data.module_name}' not found or is empty in datasets.")


    if solar_panel_data.custom_inverter:
        inverter_parameters = solar_panel_data.custom_inverter.model_dump(exclude={'name'})
    else:
        inverter_parameters = cec_inverters.get(solar_panel_data.inverter_name)


    if isinstance(inverter_parameters, pd.Series):
        inverter_parameters = inverter_parameters.to_dict()
    if not inverter_parameters or (hasattr(inverter_parameters, "empty") and inverter_parameters.empty):
        raise ValueError(f"Inverter '{solar_panel_data.inverter_name}' not found or is empty in datasets.")


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


    mc = ModelChain(system, location, aoi_model='physical', spectral_model='no_loss')


    weather_data = weather_data.tz_convert(timezone)


    mc.run_model(weather_data)


    energy_output = pd.Series(mc.results.ac.fillna(0).clip(lower=0).round(2).squeeze(), name="energy_output")


    total_panels = solar_panel_data.number_of_strings * solar_panel_data.modules_per_string
    energy_output = (energy_output * total_panels / 1000).round(2)


    energy_output.index = energy_output.index.strftime("%Y-%m-%dT%H:%M:%S%z")

    return energy_output


@functools.lru_cache(maxsize=32)
def get_module_parameters(request, module_name, is_custom=False, custom_module=None):
    """Cached lookup for module parameters"""
    if is_custom:
        return custom_module.model_dump(exclude={'name'})

    sandia_modules = request.app.state.sandia_modules
    cec_modules = request.app.state.cec_modules

    module_parameters = sandia_modules.get(module_name)
    if module_parameters is None:
        module_parameters = cec_modules.get(module_name)

    if isinstance(module_parameters, pd.Series):
        return module_parameters.to_dict()
    return module_parameters


@functools.lru_cache(maxsize=32)
def get_inverter_parameters(request, inverter_name, is_custom=False, custom_inverter=None):
    """Cached lookup for inverter parameters"""
    if is_custom:
        return custom_inverter.model_dump(exclude={'name'})

    cec_inverters = request.app.state.cec_inverters
    inverter_parameters = cec_inverters.get(inverter_name)

    if isinstance(inverter_parameters, pd.Series):
        return inverter_parameters.to_dict()
    return inverter_parameters


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

    latitude = location_data.latitude
    longitude = location_data.longitude
    timezone = location_data.timezone
    altitude = location_data.altitude
    name = location_data.name

    current_year = datetime.now().year
    start_year = current_year - 15


    location = Location(
        latitude=latitude,
        longitude=longitude,
        altitude=altitude,
        name=name,
        tz=timezone,
    )


    if solar_panel_data.custom_solar_module:
        module_parameters = get_module_parameters(
            request, None, True, solar_panel_data.custom_solar_module
        )
    elif solar_panel_data.module_name:
        module_parameters = get_module_parameters(request, solar_panel_data.module_name)
        if not module_parameters:
            raise ValueError(f"Module '{solar_panel_data.module_name}' not found in datasets.")
    else:
        raise ValueError("Either custom solar module parameters or a valid module name must be provided.")


    if solar_panel_data.custom_inverter:
        inverter_parameters = get_inverter_parameters(
            request, None, True, solar_panel_data.custom_inverter
        )
    elif solar_panel_data.inverter_name:
        inverter_parameters = get_inverter_parameters(request, solar_panel_data.inverter_name)
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

    @functools.lru_cache(maxsize=16)
    def process_year(year: int) -> pd.Series:
        try:
            logger.info(f"Fetching TMY data for year {year}...")
            df, metadata, status, headers = get_pvgis_tmy(
                latitude=latitude,
                longitude=longitude,
                outputformat='json',
                coerce_year=year,
                usehorizon=True,
                map_variables=True
            )
            weather_df = df.copy()

            mc_year = ModelChain(system, location, aoi_model='physical', spectral_model='no_loss')
            mc_year.run_model(weather_df)

            ac_output = mc_year.results.ac
            if ac_output is None:
                raise ValueError("AC output is missing from the model results.")

            monthly_energy = ac_output.resample('ME').sum()



            total_panels = solar_panel_data.number_of_strings * solar_panel_data.modules_per_string
            monthly_energy = (monthly_energy * total_panels / 1000).round(2)

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


    combined_monthly = pd.concat(monthly_outputs, axis=1).mean(axis=1).round(2)
    combined_monthly.index = combined_monthly.index.strftime('%B')
    combined_monthly.name = f"15-Year Average Monthly Energy Production ({name})"
    return combined_monthly



@functools.lru_cache(maxsize=366)
def get_solar_declination(day_of_year: int) -> float:
    """Calculate solar declination for given day of year."""
    return 23.44 * np.sin(np.radians((360 / 365) * (day_of_year - 81)))



def get_solar_declination_vectorized(day_of_year_array: np.ndarray) -> np.ndarray:
    """Vectorized calculation of solar declination for given days of year."""
    return np.vectorize(get_solar_declination)(day_of_year_array)



@functools.lru_cache(maxsize=366 * 180)
def get_max_solar_elevation(latitude: float, day_of_year: int) -> float:
    """Calculate max solar elevation for given latitude and day of year."""
    declination = get_solar_declination(day_of_year)
    return 90 - np.abs(latitude - declination)



def get_max_solar_elevation_vectorized(latitude: float, day_of_year_array: np.ndarray) -> np.ndarray:
    """Vectorized calculation of max solar elevation for given latitude and days of year."""
    return np.vectorize(lambda doy: get_max_solar_elevation(latitude, doy))(day_of_year_array)



@functools.lru_cache(maxsize=128)
def get_historical_irradiance(tilt: float, orientation: float, latitude: float, longitude: float) -> pd.DataFrame:
    """
    Cached function to fetch historical PVGIS solar irradiance data from 2013-2023.
    Returns a DataFrame indexed by (month, day, hour) with historical irradiance.
    """
    pvgis_results, _, _ = iotools.get_pvgis_hourly(
        latitude=latitude,
        longitude=longitude,
        start=2013,
        end=2023,
        surface_tilt=tilt,
        surface_azimuth=orientation,
        usehorizon=True,
        components=True,
        map_variables=True
    )


    idx = pvgis_results.index
    month_values = idx.month
    day_values = idx.day
    hour_values = idx.hour

    pvgis_results = pvgis_results.assign(
        month=month_values,
        day=day_values,
        hour=hour_values
    )


    irradiance_median = (
        pvgis_results.groupby(["month", "day", "hour"])[["poa_direct", "poa_sky_diffuse", "poa_ground_diffuse"]]
        .median()
        .reset_index()
    )
    return irradiance_median



def match_irradiance_to_weather(weather_df: pd.DataFrame, irradiance_median: pd.DataFrame) -> pd.DataFrame:
    """
    Matches weather data with median historical irradiance by merging on month, day, and hour.
    Optimized with vectorized operations.
    """
    idx = weather_df.index
    weather_df = weather_df.copy()


    weather_df = weather_df.assign(
        month=idx.month,
        day=idx.day,
        hour=idx.hour
    )


    weather_df = weather_df.reset_index().merge(
        irradiance_median, on=["month", "day", "hour"], how="left"
    )


    weather_df.set_index("datetime", inplace=True)


    weather_df.drop(columns=["month", "day", "hour"], inplace=True)
    return weather_df



def calculate_radiation(solar_panel_data, weather_df: pd.DataFrame, location: LocationData) -> pd.DataFrame:
    """
    Calculates irradiance values (GHI, DHI, DNI) based on historical PVGIS data,
    matching it to the provided weather dataset and adjusting for cloud cover.
    Returns a DataFrame with columns 'temperature', 'dni', 'dhi', and 'ghi'.
    """

    if solar_panel_data.orientation is None:
        solar_panel_data.orientation = 180.0 if location.latitude > 0 else 0.0
        print(f"✅ Auto-set orientation to {solar_panel_data.orientation}° based on latitude {location.latitude}")

    if 'cloud_cover' not in weather_df.columns:
        weather_df['cloud_cover'] = 0


    irradiance_median = get_historical_irradiance(
        solar_panel_data.tilt,
        solar_panel_data.orientation,
        location.latitude,
        location.longitude
    )
    weather_df = match_irradiance_to_weather(weather_df, irradiance_median)


    solpos = solarposition.get_solarposition(
        time=weather_df.index,
        latitude=location.latitude,
        longitude=location.longitude,
        altitude=location.altitude
    )


    weather_df["solar_elevation"] = solpos["elevation"]
    weather_df["solar_zenith"] = solpos["zenith"]


    day_of_year = weather_df.index.dayofyear.values
    weather_df["max_solar_elevation"] = get_max_solar_elevation_vectorized(
        location.latitude, day_of_year
    )


    weather_df["solar_zenith"] = weather_df["solar_zenith"].clip(lower=0, upper=90)


    cos_zenith = np.cos(np.radians(weather_df["solar_zenith"]))
    weather_df["dni"] = weather_df["poa_direct"] / cos_zenith
    weather_df["dhi"] = weather_df["poa_sky_diffuse"] + weather_df["poa_ground_diffuse"]


    cloud_factor = weather_df["cloud_cover"] / 100
    weather_df["dni"] *= np.exp(-cloud_factor * 3)
    weather_df["dhi"] *= (1 + cloud_factor * 0.6)


    weather_df["ghi"] = (weather_df["dni"] * cos_zenith) + weather_df["dhi"]


    mask_night = weather_df["solar_elevation"] <= 0
    weather_df.loc[mask_night, ["dni", "dhi", "ghi"]] = 0


    cols_to_drop = [
        "poa_direct", "poa_sky_diffuse", "poa_ground_diffuse",
        "solar_elevation", "max_solar_elevation", "cloud_cover", "solar_zenith"
    ]
    weather_df.drop(columns=cols_to_drop, inplace=True)

    return weather_df[['temperature', 'dni', 'dhi', 'ghi']]
