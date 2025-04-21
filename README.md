# EEMP - TEAM 6
## Introduction

This project is designed to provide insights into energy consumption and optimization through a combination of user-provided data, external data sources, and machine learning predictions. The system aims to deliver accurate and actionable recommendations in an intuitive format while maintaining a lightweight and scalable architecture.

## System Overview

### Backend: 
Built using FastAPI, hosted on Railway.

### Frontend: 
Developed with React.js, hosted on Railway.

### Machine Learning: 
Models are trained using XGBoost and trained on Google Cloud, hosted within backend on Railway.

### Data Sources:

**Open Power System Data**

Open Power System Data. (n.d.). Open Power System Data. Retrieved from https://open-power-system-data.org

**Western Europe Power Consumption Dataset**

Raucent, F. (n.d.). Western Europe Power Consumption. Retrieved from https://www.kaggle.com/datasets/francoisraucent/western-europe-power-consumption

**Our World in Data: Population Grapher**

Our World in Data. (n.d.). Population. Retrieved from https://ourworldindata.org/grapher/population?time=1910..latest&country=ITA~AUT~CHE~BEL~DEU~FRA~DNK~ESP~GBR~IRL~LUX~NLD~NOR~SWE~PRT

**Household Appliances Power Consumption Dataset**

EcoCo2. (n.d.). Household Appliances Power Consumption. Retrieved from https://www.kaggle.com/datasets/ecoco2/household-appliances-power-consumption


## Key Features
**Energy Consumption Predictions**: Uses XGBoost to predict energy spikes based on weather and household consumption patterns.

**Solar Production Estimates**: Utilizes pvlib for hourly and daily solar energy predictions.

**Caching**: Redis is used to optimize API calls by caching frequently requested data.

## External APIs
**Weather API**: OpenWeatherMap https://openweathermap.org/

**Solar Energy API**: pvlib https://pvlib-python.readthedocs.io/en/stable/

