import pandas as pd
import random

romaniaBB = [[22.741699,44.24721],[22.741699,47.725463],[27.37793,47.725463],[27.37793,44.24721]]

def getRandomPointInRomania():
    import random
    lat = random.uniform(romaniaBB[0][1], romaniaBB[1][1])
    lon = random.uniform(romaniaBB[0][0], romaniaBB[2][0])
    return (lat, lon)

def getRandomYear(start_year=2015, end_year=2025):
    return random.randint(start_year, end_year)

def getRandomDay():
    
    return random.randint(1, 28)

def getRandomDate():
    year = getRandomYear()
    month = random.randint(6,8)
    day = getRandomDay()
    return f"{year}-{month:02d}-{day:02d}"

def saveRandomPointsInRomania(num_points, filename):
    randomPoints = [getRandomPointInRomania() for _ in range(num_points)]
    ramdomDates = [getRandomDate() for _ in range(num_points)]
    
    data = [(lat, lon, date, 0, 0, 0, 0) for (lat, lon), date in zip(randomPoints, ramdomDates)]
    df = pd.DataFrame(data, columns=['Lat', 'Lon', 'Data', 'Inundatie_Target', 'elevation' , 'mean_precipitation_mm', 'soil_moisture'])
    df.to_csv(filename, index=False)
    
if __name__ == "__main__":
    saveRandomPointsInRomania(350, "random_points_in_romania.csv")