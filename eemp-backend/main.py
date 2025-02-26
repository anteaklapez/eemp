from fastapi import FastAPI
from pvlib.pvsystem import retrieve_sam
import router_solar
import router_weather
import router_predictions
import router_recommendations
import logging
import os

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
app.include_router(router_recommendations)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=os.getenv("HOST"), port=int(os.getenv("PORT")), reload=True)