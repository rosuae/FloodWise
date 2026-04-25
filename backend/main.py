from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()


@app.get("/")
async def root():
    return JSONResponse(content={"message": "Hello World"})

@app.get("/flood-risks")
async def get_flood_risks():
    points = [
        {
            "lat": 44.4268,
            "lng": 26.1025,
            "riskValue": 0.9,
            "radiusInMeters": 500  # Acoperă o rază de 500m pe pământ
        },
        {
            "lat": 44.4350,
            "lng": 26.1150,
            "riskValue": 0.4,
            "radiusInMeters": 300
        }
    ]
    return JSONResponse(content=points)