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
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { Gyroscope } from "expo-sensors";
import { Audio } from "expo-av";
const StartScreen = ({ onStartGame }) => {
  const [highScores, setHighScores] = useState([]);

  useEffect(() => {
    const fetchHighScores = async () => {
      try {
        const storedHighScores = await AsyncStorage.getItem("highScores");
        const parsedHighScores = storedHighScores
          ? JSON.parse(storedHighScores)
          : [];
        setHighScores(parsedHighScores);
      } catch (error) {
        console.log("Error fetching high scores:", error);
      }
    };

    fetchHighScores();
  }, []);

  const renderHighScores = () => {
    // Sort the high scores in descending order
    const sortedScores = highScores.sort((a, b) => b - a);
    // Get the top 5 highest scores
    const topScores = sortedScores.slice(0, 5);

    return (
      <View style={styles.highScoreView}>
        <Text style={styles.highScoresTitle}>High Scores</Text>
        {topScores.map((score, index) => (
          <Text key={index} style={styles.highScoreItem}>
            {index + 1}. {score}
          </Text>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {highScores.length > 0 && renderHighScores()}
      <Text style={styles.ballzText}>Ballz</Text>
      <TouchableOpacity style={styles.startButton} onPress={onStartGame}>
        <Text style={styles.startButtonText}>Start Game</Text>
      </TouchableOpacity>
    </View>
  );
};

const Ball = ({ onGameExit }) => {
  const { width, height } = Dimensions.get("window");
  const handleGameExit = async () => {
    try {
      const storedHighScores = await AsyncStorage.getItem("highScores");
      const parsedHighScores = storedHighScores
        ? JSON.parse(storedHighScores)
        : [];
      const updatedHighScores = [...parsedHighScores, score];
      await AsyncStorage.setItem(
        "highScores",
        JSON.stringify(updatedHighScores)
      );
    } catch (error) {
      console.log("Error updating high scores:", error);
    }

    onGameExit();
  };

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
        const targetY = height - 220;

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
          setTimeout(() => {
            setScore((prevScore) => prevScore + 1);
          }, 100);
        });
      },
    })
  ).current;

  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  const subscription = useRef(null);

  const toggleGyro = async () => {
    if (subscription.current) {
      await subscription.current.unsubscribe();
      subscription.current = null;
    } else {
      subscription.current = Gyroscope.addListener(setGyroData);
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
      if (subscription.current) {
        subscription.current.unsubscribe();
        subscription.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleCollisionDetection = () => {
      const ballX = ballPosition.x;
      const ballY = ballPosition.y;
      const objectX = objectPosition._value * (width - 160);
      const objectY = height - 200;

      const collisionDetected =
        ballX + 50 >= objectX &&
        ballX <= objectX + 80 &&
        ballY + 50 >= objectY &&
        ballY <= objectY + 20;

      if (collisionDetected && Math.abs(gyroData.y) > 1) {
        playSound();
        Vibration.vibrate();
        setBallPosition({ x: width / 2 - 25, y: height - 150 });
        objectPosition.setValue(0); // Reset the object's position
      }
    };

    const updateBallPosition = () => {
      const { x, y } = ballPosition;
      const { x: gyroX, y: gyroY } = gyroData;
      const newY = y + gyroY * 5;
      const boundedX = Math.max(0, Math.min(x, width - 50));
      const boundedY = Math.max(height - 200, Math.min(newY, height - 190));
      setBallPosition({ x: boundedX, y: boundedY });
    };

    const animationId = requestAnimationFrame(() => {
      updateBallPosition();
      handleCollisionDetection();
    });

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gyroData]);

  useEffect(() => {
    const handleGameExit = async () => {
      try {
        const storedHighScores = await AsyncStorage.getItem("highScores");
        const parsedHighScores = storedHighScores
          ? JSON.parse(storedHighScores)
          : [];
        const updatedHighScores = [...parsedHighScores, score];
        await AsyncStorage.setItem(
          "highScores",
          JSON.stringify(updatedHighScores)
        );
      } catch (error) {
        console.log("Error updating high scores:", error);
      }

      onGameExit();
    };

    return () => {
      handleGameExit();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.object,
          {
            transform: [
              {
                translateX: objectPosition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-(width - 160) / 2, (width - 160) / 2],
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
      <TouchableOpacity style={styles.exitButton} onPress={handleGameExit}>
        <Text style={styles.exitButtonText}>Exit</Text>
      </TouchableOpacity>
    </View>
  );
};

const App = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [highScores, setHighScores] = useState([]);

  const handleStartGame = () => {
    setGameStarted(true);
  };

  const handleGameExit = () => {
    setGameStarted(false);
  };

  useEffect(() => {
    const fetchHighScores = async () => {
      try {
        const storedHighScores = await AsyncStorage.getItem("highScores");
        const parsedHighScores = storedHighScores
          ? JSON.parse(storedHighScores)
          : [];
        setHighScores(parsedHighScores);
      } catch (error) {
        console.log("Error fetching high scores:", error);
      }
    };

    fetchHighScores();
  }, []);

  return (
    <View style={styles.container}>
      {!gameStarted && (
        <StartScreen onStartGame={handleStartGame} highScores={highScores} />
      )}
      {gameStarted && <Ball onGameExit={handleGameExit} />}
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
  ballzText: {
    fontSize: 40,
    fontWeight: "bold",
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  startButtonText: {
    fontSize: 20,
    color: "white",
  },
  object: {
    position: "absolute",
    width: 80,
    height: 20,
    borderRadius: 8,
    backgroundColor: "green",
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
    top: 60,
    alignSelf: "center",
    fontSize: 25,
    fontWeight: "bold",
  },
  highScoresTitle: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 10,
  },
  highScoreItem: {
    fontSize: 18,
    marginBottom: 5,
    alignSelf: "center",
  },
  highScoreView: {
    borderWidth: 2,
    borderRadius: 10,
    height: "25%",
    width: 150,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  exitButton: {
    backgroundColor: "#FF0000",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    position: "absolute",
    top: 50,
    right: 80,
  },
  exitButtonText: {
    fontSize: 20,
    color: "white",
  },
});

export default App;
