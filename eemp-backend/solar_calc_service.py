from pvlib.pvsystem import PVSystem, Array, FixedMount
from pvlib.modelchain import ModelChain
from pvlib.location import Location
from pvlib.temperature import TEMPERATURE_MODEL_PARAMETERS
from pvlib.iotools import get_pvgis_tmy
from pvlib.solarposition import get_solarposition
import pandas as pd
from solar_models import SolarPanelData
from fastapi import Request, HTTPException
import logging
import numpy as np
import pvlib
from datetime import datetime
import asyncio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def calculate_energy(
        request: Request,
        solar_panel_data: SolarPanelData,
        weather_data: pd.DataFrame
) -> pd.Series:
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
    else:
        module_parameters = sandia_modules.get(solar_panel_data.module_name)
        if module_parameters is None:
            module_parameters = cec_modules.get(solar_panel_data.module_name)

    if isinstance(module_parameters, pd.Series):
        module_parameters = module_parameters.to_dict()

    if module_parameters is None or (hasattr(module_parameters, "empty") and module_parameters.empty):
        raise ValueError(f"Module '{solar_panel_data.module_name}' not found or is empty in datasets.")

    if solar_panel_data.custom_inverter:
        inverter_parameters = solar_panel_data.custom_inverter.model_dump(exclude={'name'})
    else:
        inverter_parameters = cec_inverters.get(solar_panel_data.inverter_name)

    if isinstance(inverter_parameters, pd.Series):
        inverter_parameters = inverter_parameters.to_dict()

    if inverter_parameters is None or (hasattr(inverter_parameters, "empty") and inverter_parameters.empty):
        raise ValueError(f"Inverter '{solar_panel_data.inverter_name}' not found or is empty in datasets.")

    temperature_params = (
        solar_panel_data.custom_temp_model_params.model_dump()
        if solar_panel_data.custom_temp_model_params
        else TEMPERATURE_MODEL_PARAMETERS['sapm']['open_rack_glass_glass']
    )

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

    mc = ModelChain(system, location, aoi_model='physical', spectral_model='no_loss')

    weather_data = weather_data.tz_convert(solar_panel_data.location.timezone)

    mc.run_model(weather_data)

    energy_output = pd.Series(mc.results.ac.fillna(0).round(2).squeeze(), name="energy_output")

    energy_output.index = energy_output.index.strftime("%Y-%m-%dT%H:%M:%S%z")

    return energy_output


async def calculate_energy_with_tmy(
    request: Request,
    solar_panel_data: SolarPanelData
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
        latitude=solar_panel_data.location.latitude,
        longitude=solar_panel_data.location.longitude,
        altitude=solar_panel_data.location.altitude,
        name=solar_panel_data.location.name,
        tz=solar_panel_data.location.timezone,
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
                latitude=solar_panel_data.location.latitude,
                longitude=solar_panel_data.location.longitude,
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


def get_historical_irradiance(solar_panel_data):
    """
    Fetch historical PVGIS solar irradiance data from 2013-2023.
    Returns a DataFrame indexed by (month, day, hour) with historical irradiance.
    """
    pvgis_results, _, _ = pvlib.iotools.get_pvgis_hourly(
        latitude=solar_panel_data.location.latitude,
        longitude=solar_panel_data.location.longitude,
        start=2013,
        end=2023,
        surface_tilt=solar_panel_data.tilt,
        surface_azimuth=solar_panel_data.orientation,
        usehorizon=True,
        components=True,
        map_variables=True
    )

    idx = pvgis_results.index
    pvgis_results = pvgis_results.assign(
        month=idx.month,
        day=idx.day,
        hour=idx.hour
    )

    irradiance_median = (
        pvgis_results.groupby(["month", "day", "hour"])[["poa_direct", "poa_sky_diffuse", "poa_ground_diffuse"]]
        .median()
        .reset_index()
    )
    return irradiance_median


def match_irradiance_to_weather(weather_df, irradiance_median):
    """
    Matches weather data in 2025 with median historical irradiance (2013-2023)
    by merging on month, day, and hour.
    """
    idx = weather_df.index
    weather_df = weather_df.copy()  # To avoid modifying the original
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


def get_solar_declination(day_of_year_array):
    return 23.44 * np.sin(np.radians((360 / 365) * (day_of_year_array + 10)))


def get_max_solar_elevation_vectorized(latitude, day_of_year_array):
    declination = get_solar_declination(day_of_year_array)
    return 90 - np.abs(latitude - declination)


def calculate_radiation(solar_panel_data, weather_df):
    """
    Calculates irradiance values (GHI, DHI, DNI) based on historical PVGIS data,
    matching it to the provided weather dataset and adjusting for cloud cover.
    Returns a DataFrame with columns 'dni', 'dhi', and 'ghi'.
    """
    # Ensure orientation is set
    if solar_panel_data.orientation is None:
        solar_panel_data.orientation = 180.0 if solar_panel_data.location.latitude > 0 else 0.0
        print(
            f"✅ Auto-set orientation to {solar_panel_data.orientation}° based on latitude {solar_panel_data.location.latitude}")

    irradiance_median = get_historical_irradiance(solar_panel_data)
    weather_df = match_irradiance_to_weather(weather_df, irradiance_median)

    if "solar_elevation" not in weather_df.columns:
        solpos = get_solarposition(
            time=weather_df.index,
            latitude=solar_panel_data.location.latitude,
            longitude=solar_panel_data.location.longitude,
            altitude=solar_panel_data.location.altitude
        )
        weather_df["solar_elevation"] = solpos["elevation"]

    day_of_year = weather_df.index.dayofyear.values
    max_solar_elevation = get_max_solar_elevation_vectorized(solar_panel_data.location.latitude, day_of_year)
    weather_df["max_solar_elevation"] = max_solar_elevation

    weather_df["solar_zenith"] = 90 - weather_df["solar_elevation"]
    weather_df["solar_zenith_cap"] = 90 - weather_df["max_solar_elevation"]

    weather_df["solar_zenith"] = weather_df["solar_zenith"].clip(lower=0, upper=weather_df["solar_zenith_cap"])

    weather_df["poa_global"] = (weather_df["poa_direct"] +
                                weather_df["poa_sky_diffuse"] +
                                weather_df["poa_ground_diffuse"]).clip(lower=0).fillna(0)

    weather_df["dhi"] = (weather_df["poa_sky_diffuse"] + weather_df["poa_ground_diffuse"]).clip(lower=0).fillna(0)

    cos_zenith = np.cos(np.radians(weather_df["solar_zenith"]))
    cos_zenith = np.maximum(cos_zenith, 0.05)  # avoid division by zero

    cloud_factor = weather_df["cloud_cover"] / 100  # 0 to 1
    dni_factor = np.exp(-cloud_factor * 3)  # exponential decay

    weather_df["dni"] = (weather_df["poa_direct"] / cos_zenith) * dni_factor
    weather_df.loc[weather_df["solar_elevation"] <= 5, "dni"] = 0
    weather_df["dni"] = weather_df["dni"].clip(lower=0).fillna(0)

    dhi_factor = 1 + (cloud_factor * 0.6)
    weather_df["dhi"] *= dhi_factor
    weather_df["dhi"] = weather_df["dhi"].clip(lower=0).fillna(0)

    weather_df["ghi"] = (weather_df["dni"] * cos_zenith) + weather_df["dhi"]
    weather_df["ghi"] = weather_df["ghi"].clip(lower=0).fillna(0)

    weather_df.fillna(0, inplace=True)

    cols_to_drop = ["poa_global", "poa_sky_diffuse", "poa_ground_diffuse", "poa_direct",
                    "solar_elevation", "solar_zenith", "solar_zenith_cap",
                    "max_solar_elevation", "cloud_cover"]
    weather_df.drop(columns=cols_to_drop, inplace=True)

    return weather_df
