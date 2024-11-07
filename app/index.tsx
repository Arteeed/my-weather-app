import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, Region } from "react-native-maps";
import { Asset } from "expo-asset";

const API_KEY = "YOUR OPENWEATHER API";

interface WeatherData {
  locationName: string;
  temperature: number;
  description: string;
  icon: string;
  details: {
    feelsLike: number;
    humidity: number;
    windSpeed: number;
  };
}

export default function App() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState<Region>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const mapRef = useRef<MapView | null>(null);

  const getLocation = async () => {
    setLoading(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setErrorMsg("Permission to access location was denied");
      setLoading(false);
      return;
    }

    try {
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      const newRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.004,
      };

      setRegion(newRegion);

      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }

      await getLocationDetails(loc.coords.latitude, loc.coords.longitude);
    } catch (error) {
      console.error("Error getting location: ", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      setErrorMsg("Error getting location: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getLocationDetails = async (lat: number, lon: number) => {
    try {
      const geocodingResponse = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lon,
      });
      if (geocodingResponse.length > 0) {
        const locationInfo = geocodingResponse[0];
        const { city, region } = locationInfo;

        const locationName = city || region || "Unknown Location";

        await getWeatherData(lat, lon, locationName);
      } else {
        setErrorMsg("Could not determine location details");
      }
    } catch (error) {
      console.error("Error retrieving location details: ", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      setErrorMsg("Error retrieving location details: " + errorMessage);
    }
  };

  const getWeatherData = async (
    lat: number,
    lon: number,
    locationName: string
  ) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      console.log("Weather data:", data);

      if (data && data.main) {
        const newWeatherData: WeatherData = {
          locationName,
          temperature: Math.round(data.main.temp),
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          details: {
            feelsLike: Math.round(data.main.feels_like),
            humidity: data.main.humidity,
            windSpeed: data.wind.speed,
          },
        };
        setWeatherData(newWeatherData);
        generateWarningMessage(newWeatherData.description);
        await preloadImage(newWeatherData.icon);
      } else {
        setErrorMsg("Invalid data received from weather service");
      }
    } catch (error) {
      console.error("Error fetching weather data: ", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      setErrorMsg("Error fetching weather data: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const preloadImage = async (icon: string) => {
    const iconUrl = `https://openweathermap.org/img/wn/${icon}.png`;
    await Asset.loadAsync(iconUrl);
  };

  const generateWarningMessage = (description: string) => {
    if (description.includes("rain")) {
      setWarningMessage(
        "Hey, it might rain today! If you’re heading out, consider taking your umbrella just in case. Also, be sure to check traffic updates for the main roads. Stay safe out there!"
      );
      setModalVisible(true);
    } else if (description.includes("snow")) {
      setWarningMessage(
        "Hey, it’s snowing! Make sure to bundle up and check for any road conditions before heading out. Stay warm and safe!"
      );
      setModalVisible(true);
    } else if (description.includes("storm")) {
      setWarningMessage(
        "Hey, there’s a storm coming! Stay indoors if you can, Perfect time to dive into some League of Legends or Valorant and keep an eye on any weather updates.Stay safe and enjoy your gaming!"
      );
      setModalVisible(true);
    } else if (description.includes("clouds")) {
      setWarningMessage(
        "Hey, it’s a beautiful day! Perfect time to get outside. Have fun!"
      );
      setModalVisible(true);
    } else {
      setWarningMessage("");
    }
  };

  let locationText = "Waiting for location...";
  if (errorMsg) {
    locationText = errorMsg;
  } else if (location) {
    locationText = `Latitude: ${location.coords.latitude}\nLongitude: ${location.coords.longitude}`;
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Check the Weather Today!</Text>
        <TouchableOpacity style={styles.button} onPress={getLocation}>
          <Text style={styles.buttonText}>Get Weather</Text>
        </TouchableOpacity>

        <Text style={styles.locationText}>{locationText}</Text>

        {loading && <ActivityIndicator size="large" color="#784a8c" />}

        {weatherData && (
          <View style={styles.weatherContainer}>
            <Text style={styles.location}>
              Location: {weatherData.locationName}
            </Text>
            <Image
              style={styles.weatherIcon}
              source={{
                uri: `https://openweathermap.org/img/wn/${weatherData.icon}.png`,
              }}
            />
            <Text style={styles.temperature}>{weatherData.temperature}°C</Text>
            <Text style={styles.description}>{weatherData.description}</Text>
            <FlatList
              data={[
                { key: `Feels like: ${weatherData.details.feelsLike}°C` },
                { key: `Humidity: ${weatherData.details.humidity}%` },
                { key: `Wind Speed: ${weatherData.details.windSpeed} m/s` },
              ]}
              renderItem={({ item }) => (
                <Text style={styles.detail}>{item.key}</Text>
              )}
              keyExtractor={(item) => item.key}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              style={styles.detailsList}
            />
          </View>
        )}

        {location && (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              region={region}
              showsTraffic={true}
            >
              <Marker
                coordinate={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                title="You are here"
                description="Your current location"
              />
            </MapView>
          </View>
        )}

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalMessage}>{warningMessage}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Okay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  container: {
    flex: 1,
    backgroundColor: "#f4f4f9",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 30,
    color: "#131515",
    marginTop: 50,
    marginBottom: 20,
    fontWeight: "bold",
  },
  locationText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: "center",
    color: "#333",
  },
  button: {
    backgroundColor: "#006BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  weatherContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    width: "100%",
    elevation: 3,
    alignItems: "center",
  },
  location: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#2b2c28",
  },
  weatherIcon: {
    width: 100,
    height: 100,
  },
  temperature: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#49c6e5",
    textAlign: "center",
  },
  description: {
    fontSize: 20,
    color: "#666",
    textAlign: "center",
  },
  detailsList: {
    marginTop: 10,
  },
  detail: {
    fontSize: 13,
    color: "#333",
    marginHorizontal: 5,
  },
  mapContainer: {
    marginTop: 20,
    width: "100%",
    height: 290,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalMessage: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  modalButton: {
    backgroundColor: "#006BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});
