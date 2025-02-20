from fastapi import FastAPI
from pvlib.pvsystem import retrieve_sam
from router_solar import router as router_solar
from router_weather import router as router_weather
from router_predictions import router as router_predictions
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def lifespan(app: FastAPI):
    app.state.sandia_modules = retrieve_sam('SandiaMod')
    app.state.cec_modules = retrieve_sam('CECMod')
    app.state.cec_inverters = retrieve_sam('cecinverter')
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(router_solar)
app.include_router(router_weather)
app.include_router(router_predictions)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
