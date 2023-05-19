/** @format */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  PanResponder,
  Animated,
  StyleSheet,
  Text,
  Dimensions,
  Vibration,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Gyroscope } from "expo-sensors";
import { Audio } from "expo-av";

const Ball = () => {
  const { width, height } = Dimensions.get("window");

  const [ballPosition, setBallPosition] = useState({
    x: width / 2 - 25,
    y: height - 150,
  });
  const [score, setScore] = useState(0);
  const [sound, setSound] = useState();

  const pan = useRef(new Animated.ValueXY()).current;
  const objectPosition = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        const { dy } = gestureState;
        const targetY = height - 240;

        Animated.sequence([
          Animated.spring(pan, {
            toValue: { x: 0, y: dy > 0 ? -targetY : 0 },
            useNativeDriver: false,
          }),
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }),
        ]).start(() => {
          if (
            ballPosition.x >= objectPosition._value * (width - 50) - 50 &&
            ballPosition.x <= objectPosition._value * (width - 50) + 50 &&
            ballPosition.y >= height - 240 &&
            ballPosition.y <= height - 190
          ) {
            setScore((prevScore) => prevScore + 1);
            playSound();
            Vibration.vibrate();
            Animated.timing(ballPosition, {
              toValue: { x: width / 2 - 25, y: height - 150 },
              duration: 0,
              useNativeDriver: false,
            }).start();
          }
        });
      },
    })
  ).current;

  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  const [subscription, setSubscription] = useState(null);

  const toggleGyro = async () => {
    if (subscription) {
      await subscription.unsubscribe();
      setSubscription(null);
    } else {
      setSubscription(Gyroscope.addListener(setGyroData));
    }
  };

  const playSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("./assets/punch-140236.mp3")
      );
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.log("Error playing sound:", error);
    }
  };

  const stopSound = async () => {
    if (sound) {
      await sound.stopAsync();
    }
  };

  useEffect(() => {
    const moveObject = () => {
      Animated.timing(objectPosition, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(objectPosition, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          moveObject();
        });
      });
    };

    moveObject();

    toggleGyro();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
        setSubscription(null);
      }
    };
  }, []);

  useEffect(() => {
    const updateBallPosition = () => {
      const { x, y } = ballPosition;
      const { x: gyroX, y: gyroY } = gyroData;
      const newY = y + gyroY * 5;
      const boundedX = Math.max(0, Math.min(x, width - 50));
      const boundedY = Math.max(height - 200, Math.min(newY, height - 190));
      setBallPosition({ x: boundedX, y: boundedY });
    };

    updateBallPosition();
  }, [gyroData]);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Animated.View
        style={[
          styles.object,
          {
            transform: [
              {
                translateX: objectPosition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, width - 240],
                }),
              },
            ],
            top: 120,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ball,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { rotate: "180deg" },
            ],
            bottom: 80,
          },
        ]}
        {...panResponder.panHandlers}
      />
      <Text style={styles.score}>Score: {score}</Text>
    </View>
  );
};

const App = () => {
  return (
    <View style={styles.container}>
      <Ball />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF",
  },
  object: {
    position: "absolute",
    width: 80,
    height: 20,
    backgroundColor: "blue",
  },
  ball: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "red",
  },
  score: {
    position: "absolute",
    top: 50,
    right: 20,
    fontSize: 20,
    fontWeight: "bold",
  },
});

export default App;
